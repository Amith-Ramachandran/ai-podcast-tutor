import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { Document } from './document.entity';

const TWENTY_MB = 20 * 1024 * 1024;
const ACCEPTED = new Set(['application/pdf', 'text/plain', 'text/markdown']);

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: TWENTY_MB } }))
  async upload(@UploadedFile() file?: Express.Multer.File): Promise<Document> {
    if (!file) throw new BadRequestException('file is required (multipart field name: "file")');
    if (!ACCEPTED.has(file.mimetype)) {
      throw new BadRequestException(`unsupported mime type: ${file.mimetype}`);
    }
    return this.documents.uploadAndExtract(file);
  }

  @Get(':id')
  async findById(@Param('id', new ParseUUIDPipe()) id: string): Promise<Document> {
    return this.documents.findById(id);
  }
}
