import { createElement } from 'react';
import { renderWorkspaceLoading } from '../utils/productPresentation';

export default function RouteLoadingFallback() {
  return renderWorkspaceLoading(createElement);
}
