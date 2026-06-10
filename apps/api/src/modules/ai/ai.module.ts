import { Module } from '@nestjs/common';

@Module({
  // Phase 3+: shared OpenAI client wrappers (LLM, embeddings, TTS) + Qdrant client
  exports: [],
})
export class AiModule {}
