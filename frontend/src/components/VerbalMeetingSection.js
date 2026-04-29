import React, { useState, useRef, useCallback, useEffect } from 'react';
import api, { formatApiError } from '../api';
import { usesStaticGithubPagesDemo } from '../githubPagesDemo';
import { extractVerbalTranscript } from '../utils/verbalQuoteExtract';
import { appendDemoQuotes, buildDemoVerbalQuoteRecord } from '../demoQuoteStore';

const emptyExtracted = () => ({
  supplier: 'Unknown',
  product: 'Unknown',
  price: 0,
  currency: 'USD',
  country: 'Unknown',
  material: 'Unknown',
});

function VerbalMeetingSection({
  company,
  groupKey,
  manualProductLine,
  productName,
  productDescription,
  useLiz,
  getManualFieldsList,
  loadGroups,
  setMessage,
}) {
  const [meetingTitle, setMeetingTitle] = useState('Sales call');
  const [transcript, setTranscript] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [digitizing, setDigitizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [lastSource, setLastSource] = useState('');
  const mediaStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const stopStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  const stopRecording = useCallback(() => {
    const mr = recorderRef.current;
    if (mr && mr.state !== 'inactive') {
      try {
        mr.stop();
      } catch {
        /* ignore */
      }
    }
    recorderRef.current = null;
    setRecording(false);
    stopStream();
  }, [stopStream]);

  const startRecording = async () => {
    if (recording) return;
    setMessage('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size) chunksRef.current.push(e.data);
      };
      mr.onerror = () => {
        setMessage('Recording error — try again or paste a transcript.');
        stopRecording();
      };
      mr.start(250);
      setRecording(true);
    } catch (e) {
      setMessage(`Microphone unavailable: ${e?.message || String(e)}`);
    }
  };

  const buildRecordingBlob = () => {
    const chunks = chunksRef.current;
    if (!chunks.length) return null;
    const first = chunks[0];
    const type = first.type && first.type.includes('webm') ? 'audio/webm' : 'audio/webm';
    return new Blob(chunks, { type });
  };

  const handleDigitize = async () => {
    setMessage('');
    const pasted = transcript.trim();
    const blob = buildRecordingBlob();

    if (usesStaticGithubPagesDemo()) {
      if (!pasted) {
        setMessage(
          'GitHub Pages demo: paste a transcript to digitize. Connect the real API (or run locally) to send audio to Whisper.'
        );
        return;
      }
      setDigitizing(true);
      try {
        const ex = extractVerbalTranscript(pasted);
        setExtracted(ex);
        setLastSource('pasted');
        setMessage('Demo: inferred quote fields from your transcript in the browser.');
      } finally {
        setDigitizing(false);
      }
      return;
    }

    if (!pasted && (!blob || !blob.size)) {
      setMessage('Paste a transcript from the call and/or record audio, then digitize.');
      return;
    }

    setDigitizing(true);
    try {
      const fd = new FormData();
      fd.append('transcript', pasted);
      if (blob && blob.size > 0) {
        fd.append('audio', blob, 'recording.webm');
      }
      const res = await api.post('/quotes/meeting-transcribe', fd, { timeout: 180000 });
      const t = res.data?.transcript || pasted;
      setTranscript(t);
      setExtracted(res.data?.extracted || extractVerbalTranscript(t));
      setLastSource(res.data?.transcription_source || 'pasted');
      const src =
        res.data?.transcription_source === 'whisper'
          ? 'Transcribed with Whisper and parsed.'
          : 'Parsed from your transcript.';
      setMessage(src);
    } catch (error) {
      const errMsg = formatApiError(error);
      if (pasted) {
        const ex = extractVerbalTranscript(pasted);
        setExtracted(ex);
        setLastSource('pasted');
        setMessage(`${errMsg} Showing heuristic parse from pasted text only.`);
      } else {
        setMessage(errMsg);
      }
    } finally {
      setDigitizing(false);
    }
  };

  const handleStopAndDigitize = async () => {
    if (!recording) {
      await handleDigitize();
      return;
    }
    const mr = recorderRef.current;
    await new Promise((resolve) => {
      if (!mr || mr.state === 'inactive') {
        resolve();
        return;
      }
      mr.onstop = () => {
        stopStream();
        resolve();
      };
      try {
        mr.stop();
      } catch {
        resolve();
      }
      recorderRef.current = null;
      setRecording(false);
    });
    await handleDigitize();
  };

  const updateExtracted = (key, value) => {
    setExtracted((prev) => {
      const base = prev || emptyExtracted();
      if (key === 'price') {
        const n = parseFloat(String(value).replace(/,/g, ''));
        return { ...base, price: Number.isNaN(n) ? 0 : n };
      }
      return { ...base, [key]: value };
    });
  };

  const handleSave = async () => {
    if (!company?.id) {
      setMessage('Sign in first to save a verbal quote.');
      return;
    }
    const text = transcript.trim();
    if (!text) {
      setMessage('Add a transcript (or digitize from a recording) before saving.');
      return;
    }
    const ex = extracted || extractVerbalTranscript(text);
    setSaving(true);
    setMessage('');
    try {
      if (usesStaticGithubPagesDemo()) {
        const row = buildDemoVerbalQuoteRecord({
          companyId: company.id,
          groupKey,
          manualProductLine,
          meetingTitle,
          transcript: text,
          extracted: ex,
          useLiz,
          manualFieldsList: getManualFieldsList(),
          productName,
          productDescription,
        });
        appendDemoQuotes([row]);
        setMessage(`Saved verbal quote to folder “${groupKey}” (browser preview).`);
        await loadGroups();
        window.dispatchEvent(new CustomEvent('quotes:changed'));
        return;
      }
      await api.post('/quotes/meeting-save', {
        transcript: text,
        meeting_title: meetingTitle,
        group_key: groupKey,
        manual_product: manualProductLine.trim(),
        manual_fields: getManualFieldsList(),
        use_liz_recommendations: useLiz,
        product_name: productName,
        product_description: productDescription,
        extracted: ex,
      });
      setMessage(`Verbal quote saved to folder “${groupKey}”.`);
      await loadGroups();
      window.dispatchEvent(new CustomEvent('quotes:changed'));
    } catch (error) {
      setMessage(formatApiError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="upload-verbal-panel">
      <div className="upload-verbal-panel__head">
        <h3>Sales call or meeting</h3>
        {lastSource && (
          <span className="muted" style={{ fontSize: '0.82rem' }}>
            Last digitize: {lastSource === 'whisper' ? 'Whisper + parser' : 'Transcript parser'}
          </span>
        )}
      </div>
      <p className="muted" style={{ margin: '0.35rem 0 0.5rem', fontSize: '0.88rem', lineHeight: 1.5 }}>
        Record a supplier call or paste notes. With the API running and <code className="quote-library-code">OPENAI_API_KEY</code>{' '}
        set on the server, audio is transcribed with Whisper; fields are inferred from the text. You can edit fields before saving to
        your quote library (same folder and product line as file uploads above).
      </p>
      <label>
        <span className="sr-only">Meeting title</span>
        <input
          type="text"
          value={meetingTitle}
          onChange={(e) => setMeetingTitle(e.target.value)}
          placeholder="Meeting title (e.g. Acme — Q2 pricing)"
          aria-label="Meeting title"
          style={{ maxWidth: '28rem', width: '100%', marginBottom: '0.5rem' }}
        />
      </label>
      <label>
        Transcript / notes
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={5}
          placeholder="Example: Supplier is MetroParts GmbH. They quoted widget assembly SKU 88-A at twelve fifty euros per unit, shipping from Germany. Material is cold rolled steel grade DC01."
        />
      </label>
      <div className="upload-verbal-panel__actions">
        {!recording ? (
          <button type="button" className="btn-minimal" onClick={startRecording} disabled={digitizing}>
            Start recording
          </button>
        ) : (
          <button type="button" className="btn-minimal btn-recording" onClick={stopRecording}>
            Stop recording
          </button>
        )}
        <button type="button" className="btn-upload-go" onClick={handleStopAndDigitize} disabled={digitizing}>
          {digitizing ? 'Digitizing…' : recording ? 'Stop & digitize' : 'Digitize verbal quote'}
        </button>
      </div>

      {extracted && (
        <>
          <p className="muted" style={{ margin: '0.75rem 0 0.25rem', fontSize: '0.85rem' }}>
            Review and edit extracted fields, then save.
          </p>
          <div className="upload-verbal-grid">
            <label>
              Supplier
              <input value={extracted.supplier} onChange={(e) => updateExtracted('supplier', e.target.value)} />
            </label>
            <label>
              Product
              <input value={extracted.product} onChange={(e) => updateExtracted('product', e.target.value)} />
            </label>
            <label>
              Price
              <input
                type="number"
                step="any"
                value={extracted.price}
                onChange={(e) => updateExtracted('price', e.target.value)}
              />
            </label>
            <label>
              Currency
              <input value={extracted.currency} onChange={(e) => updateExtracted('currency', e.target.value)} />
            </label>
            <label>
              Country
              <input value={extracted.country} onChange={(e) => updateExtracted('country', e.target.value)} />
            </label>
            <label>
              Material
              <input value={extracted.material} onChange={(e) => updateExtracted('material', e.target.value)} />
            </label>
          </div>
          <div className="upload-row" style={{ marginTop: '0.85rem' }}>
            <button type="button" className="btn-upload-go" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save to quote library'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default VerbalMeetingSection;
