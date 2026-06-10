import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FramingType } from '../../common/enums';

export class QueryArticlesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @IsOptional()
  @IsUUID()
  storyClusterId?: string;

  @IsOptional()
  @IsEnum(FramingType)
  framingType?: FramingType;

  /** Filter: political lean >= this value */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-1)
  @Max(1)
  biasMin?: number;

  /** Filter: political lean <= this value */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-1)
  @Max(1)
  biasMax?: number;

  /** Full-text search on title */
  @IsOptional()
  @IsString()
  search?: string;

  /** Sort field */
  @IsOptional()
  @IsString()
  sortBy?: string = 'ingestedAt';

  /** Sort direction */
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
