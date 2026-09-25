import * as ort from 'onnxruntime-web/webgpu'
import type { ModelConfig } from '@/config/model.config'
import type { DetectionResult, Detector, ExecutionBackend } from '@/types/detection'
import { decodeYoloOutput } from './postprocess'
import { Preprocessor } from './preprocess'

/**
 * Detector YOLO sobre ONNX Runtime Web.
 * Intenta WebGPU y cae a WASM (CPU) si no está disponible.
 */
export class OnnxYoloDetector implements Detector {
  private session: ort.InferenceSession | null = null
  private preprocessor: Preprocessor | null = null
  private readonly config: ModelConfig

  constructor(config: ModelConfig) {
    this.config = config
  }

  async load(): Promise<ExecutionBackend> {
    // Multi-hilo solo si la página está aislada (headers COOP/COEP en vite.config.ts).
    ort.env.wasm.numThreads = self.crossOriginIsolated
      ? Math.min(4, navigator.hardwareConcurrency || 1)
      : 1

    this.preprocessor = new Preprocessor(this.config.inputSize)

    for (const backend of this.candidateBackends()) {
      try {
        this.session = await ort.InferenceSession.create(this.config.url, {
          executionProviders: [backend],
          graphOptimizationLevel: 'all',
        })
        return backend
      } catch (err) {
        console.warn(`[detector] backend "${backend}" no disponible`, err)
      }
    }
    throw new Error('No se pudo cargar el modelo con ningún backend.')
  }

  async detect(source: CanvasImageSource, width: number, height: number): Promise<DetectionResult> {
    if (!this.session || !this.preprocessor) throw new Error('Detector no inicializado: llama a load() primero.')

    const start = performance.now()
    const size = this.config.inputSize
    const { data, info } = this.preprocessor.run(source, width, height)
    const input = new ort.Tensor('float32', data, [1, 3, size, size])

    const outputs = await this.session.run({ [this.session.inputNames[0]!]: input })
    const output = outputs[this.session.outputNames[0]!]!

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
  }

  private candidateBackends(): ExecutionBackend[] {
    return 'gpu' in navigator ? ['webgpu', 'wasm'] : ['wasm']
  }
}
