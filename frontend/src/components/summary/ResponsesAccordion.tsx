import * as React from 'react';
import ResponseEditor from '../ResponseEditor';
import {createResponseWorkspace} from '../../utils/responseWorkspace';
// Keep the existing import name for SummaryPage; the view is now list → reader.
export default createResponseWorkspace(React,ResponseEditor);
