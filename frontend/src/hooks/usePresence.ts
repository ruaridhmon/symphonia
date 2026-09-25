import * as React from 'react';
import { getWebSocketUrl } from '../api/ws';
import { createPresenceHook } from '../utils/presenceConnection';
export interface Viewer { email:string; page:string; color:string; }
export const usePresence = createPresenceHook(React, getWebSocketUrl);
