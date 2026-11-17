'use client';

import { useEffect, useState } from 'react';
import {
  CONSENT_POLICY_VERSION,
  DEFAULT_CONSENT,
  loadConsentedScripts,
  readConsent,
  saveConsent,
  syncConsentToServer,
} from '@/src/consent.js';

export function ConsentPopup() {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [choice, setChoice] = useState({ ...DEFAULT_CONSENT });
  const [storageError, setStorageError] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  useEffect(() => {
    const saved = readConsent();
    if (saved) {
      setChoice({ personalData: saved.personalData, analyticsCookies: saved.analyticsCookies });
      syncConsentToServer(saved).catch(() => setSyncStatus('Настройки сохранены в браузере, но не удалось синхронизировать их с сервером. Откройте PRIVACY и сохраните выбор повторно.'));
    } else setVisible(true);
    setReady(true);

    const sync = () => {
      const latest = readConsent();
      if (!latest) {
        setChoice({ ...DEFAULT_CONSENT });
        setVisible(true);
        return;
      }
      setChoice({ personalData: latest.personalData, analyticsCookies: latest.analyticsCookies });
      loadConsentedScripts();
    };
    const onStorage = (event) => {
      if (event.key === 'mindlarp.consent.v2') sync();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('mindlarp:consent-change', sync);
    loadConsentedScripts();

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('mindlarp:consent-change', sync);
    };
  }, []);

  async function save(nextChoice, decision) {
    try {
      const record = saveConsent(nextChoice, { decision });
      setChoice(nextChoice);
      setVisible(false);
      setCustomizing(false);
      setStorageError(false);
      setSyncStatus('Синхронизируем настройки…');
      loadConsentedScripts();
      try {
        await syncConsentToServer(record);
        setSyncStatus('Настройки конфиденциальности синхронизированы.');
      } catch {
        setSyncStatus('Выбор сохранён в браузере, но серверная копия не обновилась. Откройте PRIVACY и повторите сохранение.');
      }
    } catch {
      setStorageError(true);
    }
  }

  if (!ready) return null;

  return (
    <>
      {!visible && (
        <>
          <button className="consent-settings-trigger" type="button" onClick={() => {
            setCustomizing(true);
            setVisible(true);
          }} aria-label="Открыть настройки конфиденциальности">
            <span aria-hidden="true">◈</span> PRIVACY
          </button>
          {syncStatus && <p className="consent-sync-status" role="status" aria-live="polite">{syncStatus}</p>}
        </>
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
            Необязательные категории выключены по умолчанию. Базовая обработка данных, необходимая для аккаунта и безопасности сервиса, описана в политике конфиденциальности и не управляется этим окном.
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
                  <small>Отдельное согласие для дополнительных функций и целей, которые должны быть конкретно перечислены в политике. Не является согласием на любую обработку данных.</small>
                </span>
                <input type="checkbox" checked={choice.personalData} onChange={(event) => setChoice((current) => ({ ...current, personalData: event.target.checked }))} />
              </label>
              <label className="consent-option">
                <span>
                  <strong>Аналитические и необязательные cookies</strong>
                  <small>Разрешить аналитические скрипты, явно подключённые к этой категории. Скрипты с атрибутом data-consent-src не загружаются до согласия.</small>
                </span>
                <input type="checkbox" checked={choice.analyticsCookies} onChange={(event) => setChoice((current) => ({ ...current, analyticsCookies: event.target.checked }))} />
              </label>
            </div>
          )}
          {storageError && <p className="consent-error" role="alert">Не удалось сохранить выбор в этом браузере. Настройки не применены. Проверьте, разрешено ли хранение данных сайта.</p>}
          <div className="consent-actions">
            {customizing ? (
              <>
                <button className="consent-button consent-button-muted" type="button" onClick={() => save(DEFAULT_CONSENT, 'necessary_only')}>Только необходимые</button>
                <button className="consent-button consent-button-primary" type="button" onClick={() => save(choice, 'customized')}>Сохранить выбор</button>
              </>
            ) : (
              <>
                <button className="consent-button consent-button-muted" type="button" onClick={() => save(DEFAULT_CONSENT)}>Только необходимые</button>
                <button className="consent-button consent-button-muted" type="button" onClick={() => setCustomizing(true)}>Настроить</button>
                <button className="consent-button consent-button-primary" type="button" onClick={() => save({ personalData: true, analyticsCookies: true }, 'accept_all')}>Принять всё</button>
              </>
            )}
          </div>
          <p className="consent-footnote">Выбор хранится в этом браузере и синхронизируется с сервером: сохраняются категории, версия политики, время и случайный ID браузера. При входе запись связывается с аккаунтом. Срок локального выбора — до 180 дней. Версия политики: {CONSENT_POLICY_VERSION}.</p>
        </section>
      )}
    </>
  );
}
