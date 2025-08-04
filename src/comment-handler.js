/**
 * Post a new comment on a pull request
 * @param {Object} octokit - GitHub API client
 * @param {Object} context - GitHub context
 * @param {string} body - Comment body
 * @returns {Promise<Object>} Comment response
 */
async function postComment(octokit, context, body) {
  if (context.eventName !== 'pull_request') {
    console.log('Not a pull request event, skipping comment');
    return null;
  }

  try {
    const response = await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.payload.pull_request.number,
      body
    });

    console.log(`Posted coverage comment: ${response.data.html_url}`);
    return response.data;
  } catch (error) {
    console.error('Failed to post comment:', error.message);
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

    console.log(`Updated coverage comment: ${response.data.html_url}`);
    return response.data;
  } catch (error) {
    console.error('Failed to update comment:', error.message);
    throw error;
  }
}

/**
 * Find existing coverage comment by title
 * @param {Object} octokit - GitHub API client
 * @param {Object} context - GitHub context
 * @param {string} commentTitle - Title to search for
 * @returns {Promise<Object|null>} Existing comment or null
 */
async function findExistingComment(octokit, context, commentTitle) {
  if (context.eventName !== 'pull_request') {
    return null;
  }

  try {
    const comments = await octokit.rest.issues.listComments({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.payload.pull_request.number
    });

    // Look for comments that start with the comment title
    const existingComment = comments.data.find(comment => 
      comment.body.includes(`## ${commentTitle}`) && 
      comment.user.type === 'Bot'
    );

    if (existingComment) {
      console.log(`Found existing coverage comment: ${existingComment.id}`);
      return existingComment;
    }

    return null;
  } catch (error) {
    console.error('Failed to find existing comment:', error.message);
    return null;
  }
}

/**
 * Delete old coverage comments to avoid spam
 * @param {Object} octokit - GitHub API client
 * @param {Object} context - GitHub context
 * @param {string} commentTitle - Title to search for
 * @returns {Promise<number>} Number of deleted comments
 */
async function deleteOldComments(octokit, context, commentTitle) {
  if (context.eventName !== 'pull_request') {
    return 0;
  }

  try {
    const comments = await octokit.rest.issues.listComments({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.payload.pull_request.number
    });

    const coverageComments = comments.data.filter(comment => 
      comment.body.includes(`## ${commentTitle}`) && 
      comment.user.type === 'Bot'
    );

    let deletedCount = 0;
    for (const comment of coverageComments) {
      try {
        await octokit.rest.issues.deleteComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          comment_id: comment.id
        });
        deletedCount++;
        console.log(`Deleted old coverage comment: ${comment.id}`);
      } catch (deleteError) {
        console.warn(`Failed to delete comment ${comment.id}:`, deleteError.message);
      }
    }

    return deletedCount;
  } catch (error) {
    console.error('Failed to delete old comments:', error.message);
    return 0;
  }
}

module.exports = {
  postComment,
  updateComment,
  findExistingComment,
  deleteOldComments
};
