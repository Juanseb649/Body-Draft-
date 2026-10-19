import { nextAppointment, type Appointment } from '../appointment';

const at = (id: string, dateTime: string, status: Appointment['status'] = 'pending'): Appointment => ({
  id,
  userId: 'u1',
  artistId: 'a1',
  dateTime,
  status,
});

const now = new Date('2026-10-18T12:00:00.000Z');

describe('nextAppointment', () => {
  it('sin citas no hay proxima cita (no se inventa una)', () => {
    expect(nextAppointment([], now)).toBeUndefined();
  });

  it('elige la mas cercana en el futuro, sin importar el orden de llegada', () => {
    const list = [at('lejos', '2026-11-30T10:00:00.000Z'), at('cerca', '2026-10-20T16:30:00.000Z', 'confirmed')];
    expect(nextAppointment(list, now)?.id).toBe('cerca');
  });

  it('ignora las pasadas, las canceladas y las completadas', () => {
    const list = [
      at('pasada', '2026-10-01T10:00:00.000Z'),
      at('cancelada', '2026-10-19T10:00:00.000Z', 'cancelled'),
      at('completada', '2026-10-19T11:00:00.000Z', 'completed'),
    ];
    expect(nextAppointment(list, now)).toBeUndefined();
  });
});
