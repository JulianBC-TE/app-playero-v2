export type UserDTO = {
  cedula: number;
  name: string;
  // ✨ Nuevos campos del login response
  timestamp?: number; // Timestamp del servidor en el login
  sync?: number; // Contador de sync del servidor
  idUser?: number; // ID del usuario en la app
  idSucursal?: number; // ID de la sucursal asignada
  bloqueado?: boolean; // Si el usuario está bloqueado
  expirationTime?: number; // Cuándo expira el token
};
