# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into your scriva book writing application. The integration includes automatic page view tracking, exception capture, and custom events for key user actions across the application. A reverse proxy has been configured to route PostHog requests through your domain for improved reliability and ad-blocker bypass.

## Integration Summary

### Files Created
- `instrumentation-client.ts` - PostHog client-side initialization with automatic page views and exception capture
- `lib/posthog-server.ts` - Server-side PostHog client for API route tracking

### Files Modified
- `next.config.mjs` - Added PostHog reverse proxy rewrites
- `.env.local` - Added `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` environment variables

## Events Implemented

| Event Name | Description | File |
|------------|-------------|------|
| `waitlist_joined` | User successfully signed up for the beta waitlist (conversion event) | `app/api/waitlist/route.ts` |
| `setup_completed` | User completed the setup wizard with API keys and book selection (activation event) | `components/setup/SetupWizard.tsx` |
| `book_created` | User created a new book/repository (engagement event) | `app/shelf/page.tsx` |
| `book_opened` | User opened/selected a book from the shelf (engagement event) | `app/shelf/page.tsx` |
| `export_started` | User initiated an export (EPUB, PDF, or Markdown) | `components/editor/PublishPanel.tsx` |
| `export_completed` | Export completed successfully (conversion event for publishing flow) | `components/editor/PublishPanel.tsx` |
| `ai_polish_completed` | User completed AI polish flow with accepted/rejected changes | `components/editor/PolishView.tsx` |
| `ai_continue_accepted` | User accepted AI-generated continuation text | `components/editor/ContinueWriting.tsx` |
| `ai_chat_sent` | User sent a message in the AI chat panel | `components/rightpanel/ChatPanel.tsx` |
| `collaborator_invited` | User sent a collaboration invitation (growth event) | `components/collab/ShareButton.tsx` |
| `research_saved` | User saved AI-generated research to context | `components/rightpanel/ChatPanel.tsx` |
| `revision_plan_generated` | User generated a revision plan from notes | `components/rightpanel/ChatPanel.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

### Dashboard
- [Analytics basics](https://us.posthog.com/project/315437/dashboard/1283674) - Key product metrics for scriva

### Insights
- [User Activation Funnel](https://us.posthog.com/project/315437/insights/SdanzCwz) - Tracks users from waitlist signup to completing setup
- [AI Feature Usage](https://us.posthog.com/project/315437/insights/DDR3JJTH) - Tracks usage of AI writing features: chat, continue writing, and polish
- [Exports by Format](https://us.posthog.com/project/315437/insights/DFIk5q81) - Breakdown of manuscript exports by format (EPUB, PDF, Markdown)
- [Book to Export Funnel](https://us.posthog.com/project/315437/insights/fmIg9ytn) - Tracks user journey from creating a book to using AI features to exporting
- [Collaboration Growth](https://us.posthog.com/project/315437/insights/saAAH5kJ) - Tracks weekly growth of collaboration invitations sent

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/posthog-integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
