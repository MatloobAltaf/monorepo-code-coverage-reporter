const core = require('@actions/core');

/**
 * Hidden HTML marker prefixed to every comment this action creates.
 * Lets later runs find their own comment reliably, regardless of which
 * token type posted it (github-actions bot, GitHub App, or PAT).
 * Double hyphens are collapsed to a single hyphen because `--` would
 * terminate the HTML comment early and produce a malformed marker.
 * @param {string} commentTitle - Configured comment title
 * @returns {string} Marker line
 */
function commentMarker(commentTitle) {
  const safeTitle = commentTitle.replace(/-{2,}/g, '-');
  return `<!-- monorepo-code-coverage-reporter:${safeTitle} -->`;
}

/**
 * Post a new comment on a pull request
 * @param {Object} octokit - GitHub API client
 * @param {Object} context - GitHub context
 * @param {string} body - Comment body
 * @returns {Promise<Object|null>} Comment response
 */
async function postComment(octokit, context, body) {
  if (context.eventName !== 'pull_request') {
    core.info('Not a pull request event, skipping comment');
    return null;
  }

  try {
    const response = await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.payload.pull_request.number,
      body
    });

    core.info(`Posted coverage comment: ${response.data.html_url}`);
    return response.data;
  } catch (error) {
    core.error(`Failed to post comment: ${error.message}`);
    throw error;
  }
}

/**
 * Update an existing comment
 * @param {Object} octokit - GitHub API client
 * @param {Object} context - GitHub context
 * @param {number} commentId - Comment ID to update
 * @param {string} body - New comment body
 * @returns {Promise<Object>} Comment response
 */
async function updateComment(octokit, context, commentId, body) {
  try {
    const response = await octokit.rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: commentId,
      body
    });

    core.info(`Updated coverage comment: ${response.data.html_url}`);
    return response.data;
  } catch (error) {
    core.error(`Failed to update comment: ${error.message}`);
    throw error;
  }
}

/**
 * Find the existing coverage comment for a given title.
 * Scans ALL comments (paginated). Prefers the hidden marker; falls back to
 * the legacy title match for comments created by older action versions.
 * API failures are propagated to the caller so the run fails instead of
 * creating a duplicate comment.
 * @param {Object} octokit - GitHub API client
 * @param {Object} context - GitHub context
 * @param {string} commentTitle - Title to search for
 * @returns {Promise<Object|null>} Existing comment or null
 */
async function findExistingComment(octokit, context, commentTitle) {
  if (context.eventName !== 'pull_request') {
    return null;
  }

  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.payload.pull_request.number,
    per_page: 100
  });

  const marker = commentMarker(commentTitle);
  const markedComment = comments.find((comment) => comment.body?.includes(marker));
  if (markedComment) {
    core.info(`Found existing coverage comment: ${markedComment.id}`);
    return markedComment;
  }

  const legacyComment = comments.find(
    (comment) => comment.body?.includes(`## ${commentTitle}`) && comment.user?.type === 'Bot'
  );
  if (legacyComment) {
    core.info(`Found existing legacy coverage comment: ${legacyComment.id}`);
    return legacyComment;
  }

  return null;
}

/**
 * Create or update the coverage comment for a pull request.
 * @param {Object} octokit - GitHub API client
 * @param {Object} context - GitHub context
 * @param {string} commentTitle - Configured comment title
 * @param {string} body - Comment body (without marker)
 * @param {boolean} updateExisting - Update an existing comment when found
 * @returns {Promise<Object|null>} Comment response
 */
async function upsertComment(octokit, context, commentTitle, body, updateExisting) {
  if (context.eventName !== 'pull_request') {
    core.info('Not a pull request event, skipping comment');
    return null;
  }

  const markedBody = `${commentMarker(commentTitle)}\n${body}`;

  if (updateExisting) {
    const existingComment = await findExistingComment(octokit, context, commentTitle);
    if (existingComment) {
      return updateComment(octokit, context, existingComment.id, markedBody);
    }
  }

  return postComment(octokit, context, markedBody);
}

module.exports = {
  postComment,
  updateComment,
  findExistingComment,
  upsertComment,
  commentMarker
};
