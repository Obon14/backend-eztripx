import { PartialType } from "@nestjs/mapped-types";
import { CreateDocumentGuideDto } from "./create-document-guide.dto";

export class UpdateDocumentGuideDto extends PartialType(
  CreateDocumentGuideDto,
) {}
