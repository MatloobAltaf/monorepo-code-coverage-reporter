jest.mock('@actions/core', () => ({
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

const {
  postComment,
  updateComment,
  findExistingComment,
  upsertComment,
  commentMarker
} = require('../comment-handler');

const context = {
  eventName: 'pull_request',
  repo: { owner: 'owner', repo: 'repo' },
  payload: { pull_request: { number: 42 } }
};

function makeOctokit(comments = []) {
  return {
    paginate: jest.fn().mockResolvedValue(comments),
    rest: {
      issues: {
        listComments: jest.fn(),
        createComment: jest
          .fn()
          .mockResolvedValue({ data: { id: 999, html_url: 'https://example.com/999' } }),
        updateComment: jest
          .fn()
          .mockResolvedValue({ data: { id: 1, html_url: 'https://example.com/1' } })
      }
    }
  };
}

describe('commentMarker', () => {
  it('embeds the comment title', () => {
    expect(commentMarker('Coverage Report')).toBe(
      '<!-- monorepo-code-coverage-reporter:Coverage Report -->'
    );
  });

  it('collapses double hyphens so the title cannot break the HTML comment', () => {
    expect(commentMarker('Coverage -- Report')).toBe(
      '<!-- monorepo-code-coverage-reporter:Coverage - Report -->'
    );
  });
});

describe('findExistingComment', () => {
  it('paginates all comments instead of reading only the first page', async () => {
    const octokit = makeOctokit([]);
    await findExistingComment(octokit, context, 'Coverage Report');
    expect(octokit.paginate).toHaveBeenCalledWith(
      octokit.rest.issues.listComments,
      expect.objectContaining({ owner: 'owner', repo: 'repo', issue_number: 42, per_page: 100 })
    );
  });

  it('finds a marked comment regardless of user type', async () => {
    const octokit = makeOctokit([
      { id: 1, body: 'unrelated', user: { type: 'User' } },
      {
        id: 2,
        body: `${commentMarker('Coverage Report')}\n## Coverage Report\n\nstuff`,
        user: { type: 'User' }
      }
    ]);
    const found = await findExistingComment(octokit, context, 'Coverage Report');
    expect(found.id).toBe(2);
  });

  it('falls back to legacy matching for pre-marker bot comments', async () => {
    const octokit = makeOctokit([
      { id: 3, body: '## Coverage Report\n\nold style', user: { type: 'Bot' } }
    ]);
    const found = await findExistingComment(octokit, context, 'Coverage Report');
    expect(found.id).toBe(3);
  });

  it('does not match a human comment quoting the title', async () => {
    const octokit = makeOctokit([
      { id: 4, body: 'I saw the ## Coverage Report section', user: { type: 'User' } }
    ]);
    const found = await findExistingComment(octokit, context, 'Coverage Report');
    expect(found).toBeNull();
  });

  it('returns null for non pull_request events', async () => {
    const octokit = makeOctokit([]);
    const found = await findExistingComment(octokit, { eventName: 'push' }, 'Coverage Report');
    expect(found).toBeNull();
    expect(octokit.paginate).not.toHaveBeenCalled();
  });

  it('prefers a marked comment over an earlier legacy comment', async () => {
    const octokit = makeOctokit([
      { id: 1, body: '## Coverage Report\n\nold style', user: { type: 'Bot' } },
      {
        id: 2,
        body: `${commentMarker('Coverage Report')}\n## Coverage Report\n\nnew`,
        user: { type: 'Bot' }
      }
    ]);
    const found = await findExistingComment(octokit, context, 'Coverage Report');
    expect(found.id).toBe(2);
  });

  it('does not match a marked comment for a different title', async () => {
    const octokit = makeOctokit([
      {
        id: 5,
        body: `${commentMarker('Other Title')}\n## Other Title\n\nstuff`,
        user: { type: 'Bot' }
      }
    ]);
    const found = await findExistingComment(octokit, context, 'Coverage Report');
    expect(found).toBeNull();
  });

  it('returns the oldest comment when multiple legacy comments match', async () => {
    const octokit = makeOctokit([
      { id: 11, body: '## Coverage Report\n\nfirst', user: { type: 'Bot' } },
      { id: 12, body: '## Coverage Report\n\nsecond', user: { type: 'Bot' } }
    ]);
    const found = await findExistingComment(octokit, context, 'Coverage Report');
    expect(found.id).toBe(11);
  });
});

describe('upsertComment', () => {
  it('updates the existing comment when one matches and updateExisting is true', async () => {
    const existing = {
      id: 7,
      body: `${commentMarker('Coverage Report')}\nold`,
      user: { type: 'Bot' }
    };
    const octokit = makeOctokit([existing]);
    await upsertComment(octokit, context, 'Coverage Report', '## Coverage Report\n\nnew', true);
    expect(octokit.rest.issues.updateComment).toHaveBeenCalledWith(
      expect.objectContaining({ comment_id: 7 })
    );
    expect(octokit.rest.issues.createComment).not.toHaveBeenCalled();
  });

  it('creates a comment when none matches', async () => {
    const octokit = makeOctokit([]);
    await upsertComment(octokit, context, 'Coverage Report', 'body', true);
    expect(octokit.rest.issues.createComment).toHaveBeenCalled();
  });

  it('always creates when updateExisting is false', async () => {
    const existing = {
      id: 7,
      body: `${commentMarker('Coverage Report')}\nold`,
      user: { type: 'Bot' }
    };
    const octokit = makeOctokit([existing]);
    await upsertComment(octokit, context, 'Coverage Report', 'body', false);
    expect(octokit.rest.issues.createComment).toHaveBeenCalled();
    expect(octokit.rest.issues.updateComment).not.toHaveBeenCalled();
  });

  it('prefixes the body with the hidden marker', async () => {
    const octokit = makeOctokit([]);
    await upsertComment(octokit, context, 'Coverage Report', '## Coverage Report', true);
    const body = octokit.rest.issues.createComment.mock.calls[0][0].body;
    expect(body.startsWith(commentMarker('Coverage Report'))).toBe(true);
  });

  it('does nothing on non pull_request events', async () => {
    const octokit = makeOctokit([]);
    const result = await upsertComment(octokit, { eventName: 'push' }, 'T', 'body', true);
    expect(result).toBeNull();
    expect(octokit.rest.issues.createComment).not.toHaveBeenCalled();
  });

  it('propagates listing failures instead of creating a duplicate', async () => {
    const octokit = makeOctokit([]);
    octokit.paginate.mockRejectedValue(new Error('boom'));
    await expect(upsertComment(octokit, context, 'Coverage Report', 'body', true)).rejects.toThrow(
      'boom'
    );
    expect(octokit.rest.issues.createComment).not.toHaveBeenCalled();
  });
});

describe('postComment / updateComment', () => {
  it('postComment passes owner, repo, issue number and body through', async () => {
    const octokit = makeOctokit([]);
    await postComment(octokit, context, 'hello');
    expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      issue_number: 42,
      body: 'hello'
    });
  });

  it('updateComment passes the comment id through', async () => {
    const octokit = makeOctokit([]);
    await updateComment(octokit, context, 5, 'hello');
    expect(octokit.rest.issues.updateComment).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      comment_id: 5,
      body: 'hello'
    });
  });
});
