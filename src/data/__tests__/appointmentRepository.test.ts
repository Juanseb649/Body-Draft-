import { AppointmentRepository } from '../appointmentRepository';
import { supabase } from '../../services/supabaseClient';

jest.mock('../../services/supabaseClient', () => ({ supabase: { from: jest.fn() } }));

const from = supabase.from as jest.Mock;

const base = {
  id: 'a1',
  userId: 'u1',
  artistId: 'artist-1',
  dateTime: '2026-10-21T14:00:00.000Z',
  status: 'pending' as const,
};

beforeEach(() => jest.clearAllMocks());

describe('AppointmentRepository.book', () => {
  it('una cita desde un diseno manda su design_id', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    from.mockReturnValue({ insert });

    await new AppointmentRepository().book({ ...base, designId: 'd1' });

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ design_id: 'd1', artist_id: 'artist-1' }));
  });

  it('sin diseno ni siquiera manda la columna (sirve aunque la migracion no este aplicada)', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    from.mockReturnValue({ insert });

    await new AppointmentRepository().book({ ...base, proposalId: 'p1' });

    expect(insert.mock.calls[0][0]).not.toHaveProperty('design_id');
  });

  it('si la base rechaza el diseno de otro tatuador, el error llega a quien agenda', async () => {
    from.mockReturnValue({ insert: jest.fn().mockResolvedValue({ error: { code: '23514', message: 'no pertenece' } }) });

    await expect(new AppointmentRepository().book({ ...base, designId: 'ajeno' })).rejects.toMatchObject({ code: '23514' });
  });
});
