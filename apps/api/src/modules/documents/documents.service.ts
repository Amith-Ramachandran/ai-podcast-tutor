import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promises as fs } from 'fs';
import { extname, join, resolve } from 'path';
import { v4 as uuid } from 'uuid';
import pdfParse from 'pdf-parse';
import { Document } from './document.entity';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly uploadsDir: string;

  constructor(
    @InjectRepository(Document) private readonly repo: Repository<Document>,
    private readonly config: ConfigService,
  ) {
    const storageDir = this.config.get<string>('STORAGE_DIR', './storage');
    this.uploadsDir = resolve(process.cwd(), storageDir, 'uploads');
  }

  async uploadAndExtract(file: Express.Multer.File): Promise<Document> {
    await fs.mkdir(this.uploadsDir, { recursive: true });

    const ext = extname(file.originalname).toLowerCase() || '.bin';
    const storedName = `${uuid()}${ext}`;
    const absPath = join(this.uploadsDir, storedName);
    await fs.writeFile(absPath, file.buffer);

    const doc = this.repo.create({
      title: file.originalname,
      fileUrl: absPath,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      status: 'uploaded',
    });
    const saved = await this.repo.save(doc);

    // Fire-and-forget extraction. In Phase 8 this becomes a BullMQ job.
    void this.extractInBackground(saved.id, absPath, file.mimetype);

    return saved;
  }

  private async extractInBackground(id: string, path: string, mimeType: string) {
    await this.repo.update(id, { status: 'processing' });
    try {
      const text = await this.extract(path, mimeType);
      await this.repo.update(id, {
        extractedText: text,
        charCount: text.length,
        status: 'ready',
        errorMessage: null,
      });
      this.logger.log(`extracted document ${id} (${text.length} chars)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`extraction failed for ${id}: ${message}`);
      await this.repo.update(id, { status: 'failed', errorMessage: message });
    }
  }

  private async extract(path: string, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf' || path.endsWith('.pdf')) {
      const buf = await fs.readFile(path);
      const parsed = await pdfParse(buf);
      return parsed.text.trim();
    }
    // text/plain, markdown, anything else readable as UTF-8
    return (await fs.readFile(path, 'utf-8')).trim();
  }

  async findById(id: string): Promise<Document> {
    const doc = await this.repo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException(`Document ${id} not found`);
    return doc;
  }
}
