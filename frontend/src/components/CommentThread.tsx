import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Pencil, Trash2, Reply } from 'lucide-react';
import {
	getComments as apiGetComments,
	createComment as apiCreateComment,
	updateComment as apiUpdateComment,
	deleteComment as apiDeleteComment,
} from '../api/comments';
import type { Comment } from '../api/comments';

// ─── Types ───────────────────────────────────────────────

interface CommentThreadProps {
  formId: number;
  roundId: number;
  sectionType: string;
  sectionIndex: number | null;
  token: string;
  currentUserEmail?: string;
}

// ─── Helpers ─────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Single Comment ──────────────────────────────────────

function CommentItem({
  comment,
  currentUserEmail,
  isReply,
  onReply,
  onEdit,
  onDelete,
}: {
  comment: Comment;
  currentUserEmail?: string;
  isReply?: boolean;
  onReply: (parentId: number) => void;
  onEdit: (commentId: number, newBody: string) => void;
  onDelete: (commentId: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const isOwn = currentUserEmail && comment.author_email === currentUserEmail;
  const initial = comment.author_email?.split('@')[0]?.[0]?.toUpperCase() || '?';

  const handleSaveEdit = () => {
    if (editBody.trim()) {
      onEdit(comment.id, editBody.trim());
      setIsEditing(false);
    }
  };

  return (
    <div style={{
      ...styles.commentItem,
      marginLeft: isReply ? '24px' : '0',
      borderLeft: isReply ? '2px solid var(--border)' : 'none',
      paddingLeft: isReply ? '12px' : '0',
    }}>
      <div style={styles.commentHeader}>
        <div style={styles.commentAuthor}>
          <div style={styles.commentAvatar}>{initial}</div>
          <span style={styles.commentEmail}>
            {comment.author_email?.split('@')[0] || 'Anonymous'}
          </span>
          <span style={styles.commentTime}>{timeAgo(comment.created_at)}</span>
        </div>
        <div style={styles.commentActions}>
          {isOwn && !isEditing && (
            <>
              <button
                onClick={() => { setIsEditing(true); setEditBody(comment.body); }}
                style={styles.actionBtn}
                title="Edit"
                aria-label="Edit comment"
              >
                <Pencil size={12} aria-hidden="true" />
              </button>
              <button
                onClick={() => onDelete(comment.id)}
                style={styles.actionBtn}
                title="Delete"
                aria-label="Delete comment"
              >
                <Trash2 size={12} aria-hidden="true" />
              </button>
            </>
          )}
          {!isReply && !isEditing && (
            <button
              onClick={() => onReply(comment.id)}
              style={styles.actionBtn}
              title="Reply"
              aria-label="Reply to comment"
            >
              <Reply size={12} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div style={styles.editContainer}>
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            style={styles.textarea}
            rows={2}
            aria-label="Edit comment text"
          />
          <div style={styles.editActions}>
            <button onClick={() => setIsEditing(false)} style={styles.cancelBtn}>
              Cancel
            </button>
            <button onClick={handleSaveEdit} style={styles.submitBtn}>
              Save
            </button>
          </div>
        </div>
      ) : (
        <p style={styles.commentBody}>{comment.body}</p>
      )}

      {/* Render replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div style={styles.replies}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserEmail={currentUserEmail}
              isReply
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────

export default function CommentThread({
  formId,
  roundId,
  sectionType,
  sectionIndex,
  token,
  currentUserEmail,
}: CommentThreadProps) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newBody, setNewBody] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  // Filter comments for this specific section
  const sectionComments = comments.filter(
    (c) =>
      c.section_type === sectionType &&
      c.section_index === sectionIndex &&
      c.parent_id === null
  );

  // Count includes replies
  useEffect(() => {
    let count = 0;
    for (const c of sectionComments) {
      count += 1 + (c.replies?.length || 0);
    }
    setCommentCount(count);
  }, [sectionComments]);

  // Close on Escape
  useEffect(() => {
    if (!expanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setExpanded(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [expanded]);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGetComments(formId, roundId);
      setComments(data);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [formId, roundId]);

  useEffect(() => {
    if (expanded) {
      fetchComments();
    }
  }, [expanded, fetchComments]);

  const handleSubmit = async () => {
    if (!newBody.trim() || submitting) return;
    setSubmitting(true);
    try {
      await apiCreateComment(formId, roundId, {
        section_type: sectionType,
        section_index: sectionIndex,
        parent_id: replyTo,
        body: newBody.trim(),
      });
      setNewBody('');
      setReplyTo(null);
      await fetchComments();
    } catch {
      // Silently fail
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (commentId: number, newBodyText: string) => {
    try {
      await apiUpdateComment(commentId, newBodyText);
      await fetchComments();
    } catch {
      // Silently fail
    }
  };

  const handleDelete = async (commentId: number) => {
    try {
      await apiDeleteComment(commentId);
      await fetchComments();
    } catch {
      // Silently fail
    }
  };

  const handleReply = (parentId: number) => {
    setReplyTo(parentId);
    setNewBody('');
  };

  return (
    <div style={styles.container}>
      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={styles.toggleBtn}
        title={expanded ? 'Collapse comments' : 'View comments'}
        aria-label={expanded ? 'Collapse comments' : `View comments${commentCount > 0 ? ` (${commentCount})` : ''}`}
        aria-expanded={expanded}
      >
        <span style={styles.commentIcon}><MessageSquare size={14} style={{ color: 'var(--accent)' }} aria-hidden="true" /></span>
        {commentCount > 0 && (
          <span style={styles.badge} aria-hidden="true">{commentCount}</span>
        )}
      </button>

      {/* Expanded thread */}
      {expanded && (
        <div style={styles.threadContainer}>
          {loading ? (
            <p style={styles.loadingText}>Loading comments…</p>
          ) : sectionComments.length === 0 ? (
            <p style={styles.emptyText}>No comments yet. Be the first!</p>
          ) : (
            <div style={styles.commentsList}>
              {sectionComments.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  currentUserEmail={currentUserEmail}
                  onReply={handleReply}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* Reply indicator */}
          {replyTo && (
            <div style={styles.replyIndicator}>
              <span style={styles.replyText}>
                Replying to comment…
              </span>
              <button
                onClick={() => setReplyTo(null)}
                style={styles.cancelReplyBtn}
                aria-label="Cancel reply"
              >
                ✕
              </button>
            </div>
          )}

          {/* Input */}
          <div style={styles.inputContainer}>
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder={replyTo ? 'Write a reply…' : 'Add a comment…'}
              style={styles.textarea}
              rows={2}
              aria-label={replyTo ? 'Write a reply' : 'Add a comment'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSubmit();
                }
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || !newBody.trim()}
              style={{
                ...styles.submitBtn,
                opacity: submitting || !newBody.trim() ? 0.5 : 1,
              }}
              aria-label={replyTo ? 'Submit reply' : 'Submit comment'}
            >
              {submitting ? '…' : '↑'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  toggleBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    border: '1px solid var(--border)',
    borderRadius: '9999px',
    backgroundColor: 'var(--card)',
    color: 'var(--muted-foreground)',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.15s ease',
    lineHeight: 1,
  },
  commentIcon: {
    fontSize: '14px',
  },
  badge: {
    backgroundColor: 'var(--accent)',
    color: 'var(--accent-foreground)',
    borderRadius: '9999px',
    padding: '0 6px',
    fontSize: '11px',
    fontWeight: 600,
    lineHeight: '18px',
    minWidth: '18px',
    textAlign: 'center' as const,
  },
  threadContainer: {
    position: 'absolute',
    top: '100%',
    right: '0',
    zIndex: 50,
    width: 'min(360px, calc(100vw - 2rem))',
    maxHeight: '420px',
    overflowY: 'auto' as const,
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '12px',
    marginTop: '8px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
  },
  loadingText: {
    color: 'var(--muted-foreground)',
    fontSize: '13px',
    textAlign: 'center' as const,
    padding: '12px 0',
  },
  emptyText: {
    color: 'var(--muted-foreground)',
    fontSize: '13px',
    textAlign: 'center' as const,
    padding: '12px 0',
  },
  commentsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginBottom: '12px',
  },
  commentItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  commentAuthor: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  commentAvatar: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent)',
    color: 'var(--accent-foreground)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 600,
    flexShrink: 0,
  },
  commentEmail: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--foreground)',
  },
  commentTime: {
    fontSize: '11px',
    color: 'var(--muted-foreground)',
  },
  commentActions: {
    display: 'flex',
    gap: '2px',
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '2px 4px',
    borderRadius: '4px',
    opacity: 0.6,
    transition: 'opacity 0.15s ease',
  },
  commentBody: {
    fontSize: '13px',
    lineHeight: '1.5',
    color: 'var(--foreground)',
    margin: 0,
    whiteSpace: 'pre-wrap' as const,
  },
  replies: {
    marginTop: '6px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  replyIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 8px',
    backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
    borderRadius: '6px',
    marginBottom: '6px',
  },
  replyText: {
    fontSize: '12px',
    color: 'var(--accent)',
    fontWeight: 500,
  },
  cancelReplyBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--muted-foreground)',
    fontSize: '14px',
    padding: '0 4px',
  },
  inputContainer: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-end',
  },
  textarea: {
    flex: 1,
    resize: 'none' as const,
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '13px',
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
    fontFamily: 'inherit',
    lineHeight: '1.4',
    outline: 'none',
  },
  submitBtn: {
    padding: '6px 12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'var(--accent)',
    color: 'var(--accent-foreground)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    transition: 'opacity 0.15s ease',
    flexShrink: 0,
    lineHeight: '1.4',
  },
  cancelBtn: {
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--card)',
    color: 'var(--muted-foreground)',
    cursor: 'pointer',
    fontSize: '12px',
  },
  editContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  editActions: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'flex-end',
  },
};
