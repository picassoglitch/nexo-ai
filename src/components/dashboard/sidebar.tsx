'use client';

import { useState } from 'react';
import { FusionMark } from './fusion-mark';
import { NAV } from './nav-data';

interface Props {
  userInitial: string;
  userName: string;
  userRole: string;
}

export function Sidebar({ userInitial, userName, userRole }: Props) {
  const [active, setActive] = useState('ops');

  return (
    <aside className="cc-sb">
      <div className="cc-sb-top">
        <FusionMark size={26} />
        <div className="cc-wm">
          Nexo<span> AI</span>
        </div>
        <span className="cc-env">PROD</span>
      </div>

      <div className="cc-sb-scroll">
        {NAV.map((g) => (
          <div key={g.grp} className="cc-sb-grp">
            <div className="cc-gl">{g.grp}</div>
            <div className="cc-nav">
              {g.items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  className={`cc-nav-item${active === it.id ? ' on' : ''}`}
                  onClick={() => setActive(it.id)}
                >
                  <span className="cc-ic">{it.ic}</span>
                  <span>{it.label}</span>
                  {it.live && <span className="cc-dot" />}
                  {it.ct && <span className="cc-ct">{it.ct}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="cc-sb-foot">
        <div className="cc-ava">{userInitial}</div>
        <div className="cc-u">
          <div className="cc-u-n">{userName}</div>
          <div className="cc-u-r">{userRole}</div>
        </div>
        <button type="button" className="cc-cog" title="Settings">
          ⚙
        </button>
      </div>
    </aside>
  );
}
