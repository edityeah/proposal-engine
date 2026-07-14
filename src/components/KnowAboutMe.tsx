"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

// Reusable "Know about me" button + modal. Each tab passes its own copy:
// `can` = "What I can do" paragraphs, `how` = "How to use" steps. Both accept
// inline HTML (e.g. <strong>) since the content is hard-coded, not user input.
export default function KnowAboutMe({
  icon = "ti-info-circle",
  sub,
  can,
  how,
}: {
  icon?: string;
  sub: string;
  can: string[];
  how: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-outline" onClick={() => setOpen(true)}>
        <i className="ti ti-info-circle" /> Know about me
      </button>
      {open && createPortal(
        <div className="modal-overlay" onMouseDown={() => setOpen(false)}>
          <div className="modal-card kb-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="kb-illus"><span className="kb-illus-badge"><i className={"ti " + icon} /></span></div>
            <div className="modal-title">Know about me</div>
            <div className="modal-sub">{sub}</div>
            <div className="kb-info-secs">
              <div className="kb-info-sec">
                <div className="kb-info-h"><i className="ti ti-sparkles" /> What I can do</div>
                {can.map((p, i) => <p key={i} dangerouslySetInnerHTML={{ __html: p }} />)}
              </div>
              <div className="kb-info-sec">
                <div className="kb-info-h"><i className="ti ti-list-check" /> How to use</div>
                <ol>{how.map((s, i) => <li key={i} dangerouslySetInnerHTML={{ __html: s }} />)}</ol>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setOpen(false)}><i className="ti ti-check" /> Got it</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
