export default {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      forbidden:
        'Comments are not allowed. Express intent through names and structure.',
    },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          context.report({ loc: comment.loc, messageId: 'forbidden' });
        }
      },
    };
  },
};
