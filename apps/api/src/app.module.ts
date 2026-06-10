import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { PodcastsModule } from './modules/podcasts/podcasts.module';
import { AiModule } from './modules/ai/ai.module';
import { JobsModule } from './modules/jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(process.cwd(), '../../.env')],
    }),
    DatabaseModule,
    HealthModule,
    DocumentsModule,
    PodcastsModule,
    AiModule,
    JobsModule,
  ],
})
export class AppModule {}
