import { createElement } from 'react';
import { renderWorkspaceLoading } from '../../utils/productPresentation';

export default function SummaryLoadingSkeleton() {
  return renderWorkspaceLoading(createElement);
}
