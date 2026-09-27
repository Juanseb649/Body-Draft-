/** Un tatuador disponible en la app. */
export interface Artist {
  id: string;
  name: string;
  /** Especialidad/estilo principal (p. ej. "Realismo", "Blackwork"). */
  specialty: string;
  bio?: string;
  /** Imagenes del portafolio (trabajos anteriores, no plantillas). */
  portfolioImageUrls: string[];
  location?: string;
  /** Horarios disponibles para agendar cita (ISO strings). */
  availableSlots: string[];
  rating?: number;
}
