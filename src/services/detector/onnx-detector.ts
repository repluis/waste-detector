import * as ort from 'onnxruntime-web/webgpu'
import type { ModelConfig } from '@/config/model.config'
import { ErrorCode, InferenceError, ModelError } from '@/core/errors'
import { createLogger } from '@/core/logger'
import type { DetectionResult, Detector, ExecutionBackend } from '@/types/detection'
import { decodeYoloOutput, detectOutputFormat } from './postprocess'
import { Preprocessor } from './preprocess'

const log = createLogger('detector')

/** Un .onnx real pesa MB; algo menor es HTML, un error JSON o un puntero de Git LFS. */
const MIN_MODEL_BYTES = 10 * 1024

/**
 * Detector YOLO sobre ONNX Runtime Web.
 * Intenta WebGPU y cae a WASM (CPU) si no está disponible.
 */
export class OnnxYoloDetector implements Detector {
  private session: ort.InferenceSession | null = null
  private preprocessor: Preprocessor | null = null
  private backend: ExecutionBackend | null = null
  private isFirstRun = true
  private readonly config: ModelConfig

  constructor(config: ModelConfig) {
    this.config = config
  }

  async load(): Promise<ExecutionBackend> {
    ort.env.wasm.wasmPaths = this.config.wasmPath
    ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1
    ort.env.logLevel = 'error' // oculta avisos informativos de asignación de nodos

    log.info('Inicializando detector', {
      modelo: this.config.url,
      runtimeWasm: this.config.wasmPath,
      inputSize: this.config.inputSize,
      clases: this.config.labels.length,
      hilosWasm: ort.env.wasm.numThreads,
      crossOriginIsolated: self.crossOriginIsolated,
      onnxruntime: ort.env.versions.web,
    })

    this.preprocessor = new Preprocessor(this.config.inputSize)
    const model = await this.fetchModel()

    const attempts: Record<string, string> = {}
    for (const backend of this.candidateBackends()) {
      const done = log.time(`Creación de sesión (${backend})`)
      try {
        this.session = await ort.InferenceSession.create(model, {
          executionProviders: [backend],
          graphOptimizationLevel: 'all',
          logSeverityLevel: 3, // solo errores del runtime nativo
        })
        const ms = done()
        this.backend = backend
        log.info(`Sesión creada con ${backend.toUpperCase()} en ${ms.toFixed(0)} ms`, {
          entradas: this.session.inputNames,
          salidas: this.session.outputNames,
        })
        this.auditInputShape()
        return backend
      } catch (err) {
        attempts[backend] = err instanceof Error ? err.message : String(err)
        log.warn(`Backend ${backend.toUpperCase()} falló, probando el siguiente`, err)
      }
    }

    throw new ModelError({
      code: ErrorCode.MODEL_NO_BACKEND,
      message: 'No se pudo cargar el modelo con ningún backend',
      context: { attempts, runtimeWasm: this.config.wasmPath, crossOriginIsolated: self.crossOriginIsolated },
    })
  }

  async detect(source: CanvasImageSource, width: number, height: number): Promise<DetectionResult> {
    if (!this.session || !this.preprocessor) {
      throw new ModelError({ code: ErrorCode.MODEL_NOT_LOADED, message: 'detect() llamado sin sesión activa' })
    }

    const start = performance.now()
    const size = this.config.inputSize
    const { data, info } = this.preprocessor.run(source, width, height)
    const input = new ort.Tensor('float32', data, [1, 3, size, size])

    let outputs: ort.InferenceSession.OnnxValueMapType
    try {
      outputs = await this.session.run({ [this.session.inputNames[0]!]: input })
    } catch (err) {
      throw new InferenceError({
        code: ErrorCode.INFERENCE_FAILED,
        message: `session.run() falló: ${err instanceof Error ? err.message : String(err)}`,
        context: { backend: this.backend, inputShape: [1, 3, size, size], frame: `${width}×${height}` },
        cause: err,
      })
    }
    const output = outputs[this.session.outputNames[0]!]!

    if (this.isFirstRun) this.auditFirstOutput(output.dims, performance.now() - start)

    const boxes = decodeYoloOutput(output.data as Float32Array, output.dims, {
      info,
      srcWidth: width,
      srcHeight: height,
      scoreThreshold: this.config.scoreThreshold,
      iouThreshold: this.config.iouThreshold,
      maxDetections: this.config.maxDetections,
    })
    output.dispose()

    return {
      detections: boxes.map((b) => ({ ...b, label: this.config.labels[b.classId] ?? `class_${b.classId}` })),
      inferenceMs: performance.now() - start,
    }
  }

  async dispose(): Promise<void> {
    await this.session?.release()
    this.session = null
    log.debug('Sesión liberada')
  }

  /** Descarga y valida el modelo antes de dárselo a ONNX Runtime (errores mucho más claros). */
  private async fetchModel(): Promise<Uint8Array> {
    const url = this.config.url
    const done = log.time('Descarga del modelo')

    let res: Response
    try {
      res = await fetch(url)
    } catch (err) {
      throw new ModelError({ code: ErrorCode.MODEL_FETCH_FAILED, message: `Error de red al descargar ${url}`, context: { url }, cause: err })
    }

    if (!res.ok) {
      throw new ModelError({
        code: ErrorCode.MODEL_FETCH_FAILED,
        message: `HTTP ${res.status} ${res.statusText} al descargar ${url}`,
        context: { url, status: res.status },
      })
    }

    const contentType = res.headers.get('content-type') ?? ''
    const bytes = new Uint8Array(await res.arrayBuffer())

    if (contentType.includes('text/html') || bytes.byteLength < MIN_MODEL_BYTES) {
      const preview = new TextDecoder().decode(bytes.slice(0, 120))
      throw new ModelError({
        code: ErrorCode.MODEL_INVALID,
        message: `${url} no es un modelo ONNX (${bytes.byteLength} bytes, ${contentType || 'sin content-type'})`,
        context: { url, contentType, bytes: bytes.byteLength, inicio: preview },
      })
    }

    const ms = done()
    log.info(`Modelo descargado: ${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB en ${ms.toFixed(0)} ms`)
    return bytes
  }

  private auditInputShape() {
    const meta = this.session?.inputMetadata[0]
    if (!meta?.isTensor) return
    const [, , h, w] = meta.shape
    const expected = this.config.inputSize
    if ((typeof h === 'number' && h !== expected) || (typeof w === 'number' && w !== expected)) {
      log.warn(`El modelo espera ${w}×${h} pero inputSize es ${expected}. Corrige inputSize en config/model.config.ts`, {
        forma: meta.shape,
      })
    }
  }

  private auditFirstOutput(dims: readonly number[], ms: number) {
    this.isFirstRun = false
    const format = detectOutputFormat(dims)
    log.info(`Primera inferencia OK en ${ms.toFixed(0)} ms`, { salida: `[${dims.join(', ')}]`, formato: format })

    if (format === 'raw') {
      const modelClasses = dims[1]! - 4
      if (modelClasses !== this.config.labels.length) {
        log.warn(
          `El modelo tiene ${modelClasses} clases pero hay ${this.config.labels.length} labels. Revisa "labels" en config/model.config.ts`,
        )
      }
    }
  }

  private candidateBackends(): ExecutionBackend[] {
    return 'gpu' in navigator ? ['webgpu', 'wasm'] : ['wasm']
  }
}
