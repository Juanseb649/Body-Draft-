import { socialRepository } from '../../core/services';
import { useDesignSocialStore } from '../useDesignSocialStore';

jest.mock('../../core/services', () => ({
  socialRepository: {
    getSummaries: jest.fn(),
    like: jest.fn(),
    unlike: jest.fn(),
    getComments: jest.fn(),
    addComment: jest.fn(),
    deleteComment: jest.fn(),
  },
}));

const repo = socialRepository as jest.Mocked<typeof socialRepository>;

const comment = {
  id: 'c1',
  designId: 'd1',
  userId: 'u1',
  authorName: 'Lucía Paz',
  body: 'Me encanta',
  createdAt: '2026-10-18T10:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  useDesignSocialStore.setState({ summaries: {}, comments: {}, error: undefined, isPosting: false });
});

describe('useDesignSocialStore.toggleLike', () => {
  it('el corazon cambia al instante y llama a like', async () => {
    let resolve!: () => void;
    repo.like.mockReturnValue(new Promise<void>((r) => (resolve = r)));

    const pending = useDesignSocialStore.getState().toggleLike('d1', 'u1');
    expect(useDesignSocialStore.getState().summaryOf('d1')).toMatchObject({ likeCount: 1, likedByMe: true });

    resolve();
    await expect(pending).resolves.toBe(true);
    expect(repo.like).toHaveBeenCalledWith('d1', 'u1');
  });

  it('si el servidor lo rechaza, vuelve a como estaba y deja el error', async () => {
    useDesignSocialStore.setState({ summaries: { d1: { likeCount: 3, commentCount: 0, likedByMe: true } } });
    repo.unlike.mockRejectedValue(new Error('Sin conexión'));

    await expect(useDesignSocialStore.getState().toggleLike('d1', 'u1')).resolves.toBe(false);

    const state = useDesignSocialStore.getState();
    expect(state.summaryOf('d1')).toEqual({ likeCount: 3, commentCount: 0, likedByMe: true });
    expect(state.error).toBe('Sin conexión');
  });
});

describe('useDesignSocialStore.addComment', () => {
  it('un comentario vacio ni llega al servidor', async () => {
    await expect(useDesignSocialStore.getState().addComment('d1', 'u1', '   ')).resolves.toBe(false);
    expect(repo.addComment).not.toHaveBeenCalled();
    expect(useDesignSocialStore.getState().error).toBeTruthy();
  });

  it('agrega el comentario devuelto por la base y suma al contador', async () => {
    repo.addComment.mockResolvedValue(comment);

    await expect(useDesignSocialStore.getState().addComment('d1', 'u1', '  Me encanta ')).resolves.toBe(true);

    expect(repo.addComment).toHaveBeenCalledWith('d1', 'u1', 'Me encanta');
    const state = useDesignSocialStore.getState();
    expect(state.comments.d1).toEqual([comment]);
    expect(state.summaryOf('d1').commentCount).toBe(1);
  });
});

describe('useDesignSocialStore.deleteComment', () => {
  it('lo quita de la lista y resta al contador', async () => {
    useDesignSocialStore.setState({
      comments: { d1: [comment] },
      summaries: { d1: { likeCount: 0, commentCount: 1, likedByMe: false } },
    });
    repo.deleteComment.mockResolvedValue();

    await useDesignSocialStore.getState().deleteComment(comment);

    const state = useDesignSocialStore.getState();
    expect(state.comments.d1).toEqual([]);
    expect(state.summaryOf('d1').commentCount).toBe(0);
  });
});

describe('useDesignSocialStore.loadComments', () => {
  it('el contador pasa a ser el largo real de la lista', async () => {
    repo.getComments.mockResolvedValue([comment, { ...comment, id: 'c2' }]);
    await useDesignSocialStore.getState().loadComments('d1');
    expect(useDesignSocialStore.getState().summaryOf('d1').commentCount).toBe(2);
  });
});
