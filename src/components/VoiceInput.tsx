'use client';

import { useEffect, useRef, useState } from 'react';
import { createBrowserRecognition } from '@/lib/speechToText';

interface Props {
  label: string;
  placeholder: string;
  value: string;
  onChange: (text: string) => void;
  onSubmit: (text: string) => void;
  submitLabel?: string;
}

export function VoiceInput({ label, placeholder, value, onChange, onSubmit, submitLabel = 'Generate' }: Props) {
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef(createBrowserRecognition());

  useEffect(() => {
    const rec = recRef.current;
    setSupported(rec.supported);
    rec.onResult((text) => {
      onChange(text);
      setRecording(false);
    });
    rec.onError(() => setRecording(false));
  }, [onChange]);

  function toggleRec() {
    const rec = recRef.current;
    if (!rec.supported) return;
    if (recording) {
      rec.stop();
      setRecording(false);
    } else {
      rec.start();
      setRecording(true);
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>{label}</h2>
        {supported ? (
          <button
            type="button"
            className={`mic ${recording ? 'mic-on' : ''}`}
            aria-label={recording ? 'Stop recording' : 'Start voice input'}
            onClick={toggleRec}
          >
            {recording ? 'Listening…' : 'Speak'}
          </button>
        ) : (
          <span className="tag small">type below</span>
        )}
      </div>
      <textarea
        className="textarea"
        rows={3}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onSubmit(value)}
          disabled={!value.trim()}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
