import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ResidentialComplexType } from '@prisma/client';
import { CreateClientDto } from './client.dto';

export class FloorVariationDto {
  @ApiProperty({ example: 1 })
  @IsInt({ message: 'El número de piso debe ser un entero.' })
  @Min(1, { message: 'El número de piso mínimo es 1.' })
  floorNumber: number;

  @ApiProperty({ example: 6 })
  @IsInt({ message: 'La cantidad de apartamentos debe ser un entero.' })
  @Min(1, { message: 'La cantidad mínima de apartamentos es 1.' })
  apartmentsAmount: number;
}

export class TowerDefinitionDto {
  @ApiProperty({ example: 'Torre 1' })
  @IsString({ message: 'El nombre de la torre debe ser un texto válido.' })
  towerName: string;

  @ApiProperty({ example: 10 })
  @IsInt({ message: 'La cantidad de pisos debe ser un entero.' })
  @Min(1, { message: 'La cantidad mínima de pisos es 1.' })
  floorsAmount: number;

  @ApiProperty({ example: 4 })
  @IsInt({ message: 'La cantidad de apartamentos por piso debe ser un entero.' })
  @Min(1, { message: 'La cantidad mínima de apartamentos por piso es 1.' })
  apartmentsPerFloor: number;

  @ApiProperty({ example: 2, required: false, default: 0 })
  @IsInt({ message: 'La cantidad de ascensores debe ser un entero.' })
  @Min(0)
  @IsOptional()
  elevators?: number;

  @ApiProperty({ type: [FloorVariationDto], required: false })
  @IsArray({ message: 'Las variaciones de piso deben estar en una lista.' })
  @ValidateNested({ each: true })
  @Type(() => FloorVariationDto)
  @IsOptional()
  customFloorVariations?: FloorVariationDto[];
}

export class StructureConfigDto {
  @ApiProperty({ enum: ResidentialComplexType, default: ResidentialComplexType.BUILDING_CLUSTER })
  @IsEnum(ResidentialComplexType, { message: 'El tipo de complejo residencial no es válido.' })
  structureType: ResidentialComplexType;

  @ApiProperty({ example: 2, required: false })
  @IsInt({ message: 'La cantidad de torres debe ser un entero.' })
  @Min(1, { message: 'La cantidad mínima de torres es 1.' })
  @IsOptional()
  towersAmount?: number;

  @ApiProperty({ example: 10, required: false })
  @IsInt({ message: 'La cantidad de pisos debe ser un entero.' })
  @Min(1, { message: 'La cantidad mínima de pisos es 1.' })
  @IsOptional()
  floorsAmount?: number;

  @ApiProperty({ example: 4, required: false })
  @IsInt({ message: 'La cantidad de inmuebles por piso debe ser un entero.' })
  @Min(1, { message: 'La cantidad mínima de inmuebles por piso es 1.' })
  @IsOptional()
  apartmentsPerFloor?: number;

  @ApiProperty({ example: 50, required: false })
  @IsInt({ message: 'La cantidad total de inmuebles/casas debe ser un entero.' })
  @Min(1, { message: 'La cantidad mínima de inmuebles es 1.' })
  @IsOptional()
  unitsAmount?: number;

  @ApiProperty({ example: 'Casa', required: false })
  @IsString({ message: 'El prefijo de la unidad debe ser un texto válido.' })
  @IsOptional()
  prefix?: string;

  @ApiProperty({ type: [TowerDefinitionDto], required: false })
  @IsArray({ message: 'Las definiciones de torre deben estar en una lista.' })
  @ValidateNested({ each: true })
  @Type(() => TowerDefinitionDto)
  @IsOptional()
  towers?: TowerDefinitionDto[];

  @ApiProperty({ type: [FloorVariationDto], required: false })
  @IsArray({ message: 'Las variaciones de piso deben estar en una lista.' })
  @ValidateNested({ each: true })
  @Type(() => FloorVariationDto)
  @IsOptional()
  customFloorVariations?: FloorVariationDto[];

  // Amenities
  @ApiProperty({ default: false, required: false })
  @IsBoolean({ message: 'El indicador de salón social debe ser booleano.' })
  @IsOptional()
  hasSocialRoom?: boolean;

  @ApiProperty({ default: 0, required: false })
  @IsInt({ message: 'La cantidad de salones sociales debe ser un entero.' })
  @IsOptional()
  socialRoomAmount?: number;

  @ApiProperty({ default: false, required: false })
  @IsBoolean({ message: 'El indicador de gimnasio debe ser booleano.' })
  @IsOptional()
  hasGym?: boolean;

  @ApiProperty({ default: 0, required: false })
  @IsInt({ message: 'La cantidad de gimnasios debe ser un entero.' })
  @IsOptional()
  gymAmount?: number;

  @ApiProperty({ default: false, required: false })
  @IsBoolean({ message: 'El indicador de piscina debe ser booleano.' })
  @IsOptional()
  hasPool?: boolean;

  @ApiProperty({ default: 0, required: false })
  @IsInt({ message: 'La cantidad de piscinas debe ser un entero.' })
  @IsOptional()
  poolAmount?: number;

  @ApiProperty({ default: false, required: false })
  @IsBoolean({ message: 'El indicador de cancha de tenis debe ser booleano.' })
  @IsOptional()
  hasTennisCourt?: boolean;

  @ApiProperty({ default: 0, required: false })
  @IsInt({ message: 'La cantidad de canchas de tenis debe ser un entero.' })
  @IsOptional()
  tennisCourtAmount?: number;

  @ApiProperty({ default: false, required: false })
  @IsBoolean({ message: 'El indicador de cancha de baloncesto debe ser booleano.' })
  @IsOptional()
  hasBasketballCourt?: boolean;

  @ApiProperty({ default: 0, required: false })
  @IsInt({ message: 'La cantidad de canchas de baloncesto debe ser un entero.' })
  @IsOptional()
  basketballCourtAmount?: number;

  @ApiProperty({ default: false, required: false })
  @IsBoolean({ message: 'El indicador de cancha de fútbol debe ser booleano.' })
  @IsOptional()
  hasFootballCourt?: boolean;

  @ApiProperty({ default: 0, required: false })
  @IsInt({ message: 'La cantidad de canchas de fútbol debe ser un entero.' })
  @IsOptional()
  footballCourtAmount?: number;

  @ApiProperty({ default: false, required: false })
  @IsBoolean({ message: 'El indicador de cancha de voleibol debe ser booleano.' })
  @IsOptional()
  hasVolleyballCourt?: boolean;

  @ApiProperty({ default: 0, required: false })
  @IsInt({ message: 'La cantidad de canchas de voleibol debe ser un entero.' })
  @IsOptional()
  volleyballCourtAmount?: number;

  @ApiProperty({ default: false, required: false })
  @IsBoolean({ message: 'El indicador de cancha de squash debe ser booleano.' })
  @IsOptional()
  hasSquashCourt?: boolean;

  @ApiProperty({ default: 0, required: false })
  @IsInt({ message: 'La cantidad de canchas de squash debe ser un entero.' })
  @IsOptional()
  squashCourtAmount?: number;

  @ApiProperty({ default: false, required: false })
  @IsBoolean({ message: 'El indicador de parque infantil debe ser booleano.' })
  @IsOptional()
  hasPlayground?: boolean;

  @ApiProperty({ default: 0, required: false })
  @IsInt({ message: 'La cantidad de parques infantiles debe ser un entero.' })
  @IsOptional()
  playgroundAmount?: number;

  @ApiProperty({ default: false, required: false })
  @IsBoolean({ message: 'El indicador de parqueadero privado debe ser booleano.' })
  @IsOptional()
  hasParking?: boolean;

  @ApiProperty({ default: 0, required: false })
  @IsInt({ message: 'La cantidad de parqueaderos privados debe ser un entero.' })
  @IsOptional()
  parkingAmount?: number;

  @ApiProperty({ default: false, required: false })
  @IsBoolean({ message: 'El indicador de parqueadero de visitantes debe ser booleano.' })
  @IsOptional()
  hasGuestParking?: boolean;

  @ApiProperty({ default: 0, required: false })
  @IsInt({ message: 'La cantidad de parqueaderos de visitantes debe ser un entero.' })
  @IsOptional()
  guestParkingAmount?: number;

  @ApiProperty({ default: false, required: false })
  @IsBoolean({ message: 'El indicador de bicicletero debe ser booleano.' })
  @IsOptional()
  hasBicycleRack?: boolean;

  @ApiProperty({ default: 0, required: false })
  @IsInt({ message: 'La cantidad de bicicleteros debe ser un entero.' })
  @IsOptional()
  bicycleRackAmount?: number;

  @ApiProperty({ default: false, required: false })
  @IsBoolean({ message: 'El indicador de locales comerciales debe ser booleano.' })
  @IsOptional()
  hasCommercialStores?: boolean;

  @ApiProperty({ default: 0, required: false })
  @IsInt({ message: 'La cantidad de locales comerciales debe ser un entero.' })
  @IsOptional()
  commercialStoresAmount?: number;

  @ApiProperty({ default: false, required: false })
  @IsBoolean({ message: 'El indicador de depósito debe ser booleano.' })
  @IsOptional()
  hasStorageRoom?: boolean;

  @ApiProperty({ default: 0, required: false })
  @IsInt({ message: 'La cantidad de depósitos debe ser un entero.' })
  @IsOptional()
  storageRoomAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  entriesDescription?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  entriesMediaFiles?: Record<string, any>;
}

export class CreateClientWithStructureDto extends CreateClientDto {
  @ApiProperty({ type: StructureConfigDto, required: false })
  @ValidateNested()
  @Type(() => StructureConfigDto)
  @IsOptional()
  structureConfig?: StructureConfigDto;
}
