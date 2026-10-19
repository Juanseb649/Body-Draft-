import { SocialRepository } from '../socialRepository';
import { supabase } from '../../services/supabaseClient';

jest.mock('../../services/supabaseClient', () => ({ supabase: { from: jest.fn() } }));

const from = supabase.from as jest.Mock;

function builder(result: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {};
  for (const method of ['select', 'eq', 'in', 'insert', 'delete', 'order']) {
    chain[method] = jest.fn(() => chain);
  }
  chain.single = jest.fn().mockResolvedValue(result);
  (chain as unknown as PromiseLike<unknown>).then = ((onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected)) as PromiseLike<unknown>['then'];
  return chain;
}

const repo = new SocialRepository();

beforeEach(() => jest.clearAllMocks());

describe('SocialRepository.getSummaries', () => {
  it('cuenta me gusta y comentarios por diseno, y marca los del usuario', async () => {
    from.mockImplementation((table: string) =>
      table === 'design_likes'
        ? builder({
            data: [
              { design_id: 'd1', user_id: 'u1' },
              { design_id: 'd1', user_id: 'u2' },
              { design_id: 'd2', user_id: 'u2' },
            ],
            error: null,
          })
        : builder({ data: [{ design_id: 'd2' }, { design_id: 'd2' }], error: null }),
    );

    const summaries = await repo.getSummaries(['d1', 'd2', 'd3'], 'u1');

    expect(summaries).toEqual({
      d1: { likeCount: 2, commentCount: 0, likedByMe: true },
      d2: { likeCount: 1, commentCount: 2, likedByMe: false },
      d3: { likeCount: 0, commentCount: 0, likedByMe: false },
    });
  });

  it('sin disenos no consulta nada', async () => {
    expect(await repo.getSummaries([])).toEqual({});
    expect(from).not.toHaveBeenCalled();
  });
});

describe('SocialRepository.like', () => {
  it('un me gusta repetido (23505) no es un error: el resultado ya es el que se queria', async () => {
    from.mockReturnValue(builder({ data: null, error: { code: '23505', message: 'duplicate key' } }));
    await expect(repo.like('d1', 'u1')).resolves.toBeUndefined();
  });

  it('cualquier otro error (p. ej. RLS) si se propaga', async () => {
    from.mockReturnValue(builder({ data: null, error: { code: '42501', message: 'RLS' } }));
    await expect(repo.like('d1', 'u1')).rejects.toMatchObject({ code: '42501' });
  });
});

describe('SocialRepository.addComment', () => {
  it('no manda el nombre del autor: lo pone la base, y se lee de la fila devuelta', async () => {
    const chain = builder({
      data: {
        id: 'c1',
        design_id: 'd1',
        user_id: 'u1',
        author_name: 'Lucía Paz',
        body: 'Me encanta',
        created_at: '2026-10-18T10:00:00.000Z',
      },
      error: null,
    });
    from.mockReturnValue(chain);

    const comment = await repo.addComment('d1', 'u1', 'Me encanta');

    expect(chain.insert).toHaveBeenCalledWith({ design_id: 'd1', user_id: 'u1', body: 'Me encanta' });
    expect(comment.authorName).toBe('Lucía Paz');
  });
});
