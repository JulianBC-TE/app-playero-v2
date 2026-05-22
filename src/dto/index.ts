/**
 * @module Playero/DTO
 * @category Data Transfer Objects
 */

export * from './BodegaDTO';
export * from './ClienteDTO';
export * from './MedicionDTO';
export * from './PersonaDTO';
export * from './PicosDTO';
export * from './SequenciaCalibracionDTO';
export * from './statusTurnoDTO';
export * from './sucursalDTO';
export * from './TanqueDTO';
export * from './TraspasoDTO';
export * from './TurnoDTO';
export * from './userDTO';
export * from './VehiculoDTO';
export * from "./CargaZetaDTO";
export * from "./HistoryByDayDTO";
export * from "./HistoryDTO";
export * from "./MenuItens";
// ⚠️ Estos están mal ubicados actualmente, deberías moverlos aquí:
// CargaZetaDTO.ts (está en components/)
// HistoryByDayDTO.ts, HistoryDTO.ts (están en backend/)
// MedicionesCard no es DTO pero tiene DTO en el nombre