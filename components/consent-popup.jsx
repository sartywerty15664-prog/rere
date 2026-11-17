'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'mindlarp.consent.v1';
const POLICY_VERSION = '2026-11-17';

const DEFAULTS = {
  personalData: false,
  analyticsCookies: false,
};

function readSavedChoice() {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    if (!value || value.version !== POLICY_VERSION) return null;
    return {
      personalData: value.personalData === true,
      analyticsCookies: value.analyticsCookies === true,
    };
  } catch {
    return null;
  }
}

export function ConsentPopup() {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [choice, setChoice] = useState(DEFAULTS);

  useEffect(() => {
    const saved = readSavedChoice();
    if (saved) setChoice(saved);
    else setVisible(true);
    setReady(true);
  }, []);

  function save(nextChoice) {
    const record = {
      ...nextChoice,
      version: POLICY_VERSION,
      savedAt: new Date().toISOString(),
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {
      // Keep the current page usable when browser storage is unavailable.
    }

    setChoice(nextChoice);
    setVisible(false);
    setCustomizing(false);
  }

  if (!ready) return null;

  return (
    <>
      {!visible && (
        <button
          className="consent-settings-trigger"
          type="button"
          onClick={() => {
            setCustomizing(true);
            setVisible(true);
          }}
          aria-label="Открыть настройки конфиденциальности"
        >
          <span aria-hidden="true">◈</span> PRIVACY
        </button>
      )}

      {visible && (
        <section className="consent-popup" role="dialog" aria-modal="false" aria-labelledby="consent-title" aria-describedby="consent-description">
          <div className="consent-popup-topline">
            <span><i aria-hidden="true" /> MINDLARP / PRIVACY CENTER</span>
            <span>01 — 02</span>
          </div>
          <div className="consent-popup-heading">
            <span className="consent-mark" aria-hidden="true">M_</span>
            <div>
              <span className="section-kicker">YOUR DATA. YOUR CHOICE.</span>
              <h2 id="consent-title">Настройки конфиденциальности</h2>
            </div>
          </div>
          <p id="consent-description" className="consent-intro">
            Выберите, разрешаете ли вы дополнительную обработку персональных данных и необязательные cookies.
            Необходимые технологии сайта работают независимо от этих настроек.
          </p>
          <div className="consent-links">
            <a href="/legal">Политика конфиденциальности <span aria-hidden="true">↗</span></a>
            <a href="/legal#cookies">О cookies <span aria-hidden="true">↗</span></a>
          </div>

          {customizing && (
            <div className="consent-options">
              <label className="consent-option">
                <span>
                  <strong>Дополнительная обработка персональных данных</strong>
                  <small>Согласие на дополнительные цели обработки, которые должны быть конкретно описаны в политике конфиденциальности. Необходимая для работы сервиса обработка регулируется отдельно.</small>
                </span>
                <input
                  type="checkbox"
                  checked={choice.personalData}
                  onChange={(event) => setChoice((current) => ({ ...current, personalData: event.target.checked }))}
                />
              </label>
              <label className="consent-option">
                <span>
                  <strong>Аналитические и необязательные cookies</strong>
                  <small>Разрешить необязательные cookies для анализа использования сайта. Они не должны устанавливаться до вашего согласия.</small>
                </span>
                <input
                  type="checkbox"
                  checked={choice.analyticsCookies}
                  onChange={(event) => setChoice((current) => ({ ...current, analyticsCookies: event.target.checked }))}
                />
              </label>
            </div>
          )}

          <div className="consent-actions">
            {customizing ? (
              <>
                <button className="consent-button consent-button-muted" type="button" onClick={() => save(DEFAULTS)}>Только необходимые</button>
                <button className="consent-button consent-button-primary" type="button" onClick={() => save(choice)}>Сохранить выбор</button>
              </>
            ) : (
              <>
                <button className="consent-button consent-button-muted" type="button" onClick={() => save(DEFAULTS)}>Только необходимые</button>
                <button className="consent-button consent-button-muted" type="button" onClick={() => setCustomizing(true)}>Настроить</button>
                <button className="consent-button consent-button-primary" type="button" onClick={() => save({ personalData: true, analyticsCookies: true })}>Принять всё</button>
              </>
            )}
          </div>
          <p className="consent-footnote">Выбор сохраняется в этом браузере. Серверная фиксация согласия пока не подключена. Изменить выбор можно позже через кнопку PRIVACY. Версия настроек: {POLICY_VERSION}.</p>
        </section>
      )}
    </>
  );
}
