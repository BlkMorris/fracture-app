import {
  IsString,
  IsUrl,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { SourceTier } from '../../common/enums';

export class CreateSourceDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsUrl()
  rssFeedUrl?: string;

  @IsOptional()
  @IsEnum(SourceTier)
  tier?: SourceTier;

  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  politicalLeanPrior?: number;

  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  establishmentPrior?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  reliabilityScore?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
