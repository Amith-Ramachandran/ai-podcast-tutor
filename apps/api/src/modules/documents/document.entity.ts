import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type DocumentStatus = 'uploaded' | 'processing' | 'ready' | 'failed';

@Entity({ name: 'documents' })
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  title!: string;

  @Column({ name: 'file_url', type: 'text' })
  fileUrl!: string;

  @Column({ name: 'mime_type', type: 'text' })
  mimeType!: string;

  @Column({ name: 'size_bytes', type: 'integer' })
  sizeBytes!: number;

  @Column({ name: 'extracted_text', type: 'text', nullable: true })
  extractedText!: string | null;

  @Column({ name: 'char_count', type: 'integer', nullable: true })
  charCount!: number | null;

  @Index()
  @Column({ type: 'text', default: 'uploaded' })
  status!: DocumentStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
