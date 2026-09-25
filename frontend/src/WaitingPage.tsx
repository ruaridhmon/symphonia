import * as React from 'react';
import {useNavigate,useLocation} from 'react-router-dom';
import {api} from './api/client';
import {createSubmissionReceipt} from './utils/submissionReceipt';
import {useDocumentTitle} from './hooks/useDocumentTitle';
const Receipt=createSubmissionReceipt(React,api.get);
export default function WaitingPage(){
 const navigate=useNavigate(),location=useLocation();
 useDocumentTitle('Response submitted');
 return <Receipt context={location.state||{}} navigate={navigate}/>;
}
