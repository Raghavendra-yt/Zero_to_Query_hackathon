import React, { useState, useEffect, useRef } from 'react';
import { login } from '../lib/api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Refs for tracking animation state variables (avoids React re-renders for mouse movements)
  const mouseX = useRef(0);
  const mouseY = useRef(0);
  const isTyping = useRef(false);
  const lookingAtEachOther = useRef(false);
  const purplePeeking = useRef(false);
  const purpleBlink = useRef(false);
  const blackBlink = useRef(false);

  const passwordLengthRef = useRef(0);
  const showPasswordRef = useRef(false);

  // Sync password length and toggle state to refs for the animation loop
  useEffect(() => {
    passwordLengthRef.current = password.length;
  }, [password]);

  useEffect(() => {
    showPasswordRef.current = showPassword;
  }, [showPassword]);

  // DOM Refs for animation targets
  const purpleRef = useRef(null);
  const blackRef = useRef(null);
  const orangeRef = useRef(null);
  const yellowRef = useRef(null);

  const purpleEyesRef = useRef(null);
  const blackEyesRef = useRef(null);
  const orangeEyesRef = useRef(null);
  const yellowEyesRef = useRef(null);
  const yellowMouthRef = useRef(null);

  const handleFocus = () => {
    isTyping.current = true;
    triggerLookAtEachOther();
  };

  const handleBlur = () => {
    isTyping.current = false;
    lookingAtEachOther.current = false;
  };

  const triggerLookAtEachOther = () => {
    lookingAtEachOther.current = true;
    setTimeout(() => {
      lookingAtEachOther.current = false;
    }, 800);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please fill in both fields.');
      return;
    }

    try {
      await login(email, password);
      setError('');
      onLogin();
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    }
  };

  useEffect(() => {
    // ── Mouse Move Listener ──
    const handleMouseMove = (e) => {
      mouseX.current = e.clientX;
      mouseY.current = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // ── Blinking Animation Loops ──
    const startBlinking = (setBlinkRef) => {
      let timeoutId;
      let active = true;

      const schedule = () => {
        if (!active) return;
        const delay = Math.random() * 4000 + 3000;
        timeoutId = setTimeout(() => {
          setBlinkRef.current = true;
          timeoutId = setTimeout(() => {
            setBlinkRef.current = false;
            schedule();
          }, 150);
        }, delay);
      };

      schedule();
      return () => {
        active = false;
        clearTimeout(timeoutId);
      };
    };

    const cleanBlink1 = startBlinking(purpleBlink);
    const cleanBlink2 = startBlinking(blackBlink);

    // ── Peeking Password Animation Loop ──
    let peekTimeout1, peekTimeout2;
    const schedulePeek = () => {
      if (passwordLengthRef.current > 0 && showPasswordRef.current) {
        const delay = Math.random() * 3000 + 2000;
        peekTimeout1 = setTimeout(() => {
          if (passwordLengthRef.current > 0 && showPasswordRef.current) {
            purplePeeking.current = true;
            peekTimeout2 = setTimeout(() => {
              purplePeeking.current = false;
              schedulePeek();
            }, 800);
          }
        }, delay);
      }
    };

    const peekInterval = setInterval(() => {
      if (passwordLengthRef.current > 0 && showPasswordRef.current && !purplePeeking.current) {
        schedulePeek();
      }
    }, 1000);

    // ── Helper Math Functions ──
    function calcPos(el) {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 3;
      const dx = mouseX.current - cx;
      const dy = mouseY.current - cy;
      return {
        faceX: Math.max(-15, Math.min(15, dx / 20)),
        faceY: Math.max(-10, Math.min(10, dy / 30)),
        bodySkew: Math.max(-6, Math.min(6, -dx / 120)),
      };
    }

    function eyePupilOffset(el, maxDist, forceX, forceY) {
      if (forceX !== undefined && forceY !== undefined)
        return { x: forceX, y: forceY };
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = mouseX.current - cx;
      const dy = mouseY.current - cy;
      const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist);
      const angle = Math.atan2(dy, dx);
      return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
    }

    function setPupil(eyeEl, maxDist, forceX, forceY) {
      const pupil = eyeEl.querySelector('.pupil');
      if (!pupil) return;
      const o = eyePupilOffset(eyeEl, maxDist, forceX, forceY);
      pupil.style.transform = `translate(${o.x}px, ${o.y}px)`;
    }

    function setPupilOnly(el, maxDist, forceX, forceY) {
      const o = eyePupilOffset(el, maxDist, forceX, forceY);
      el.style.transform = `translate(${o.x}px, ${o.y}px)`;
    }

    // ── Animation Frame loop ──
    let animFrameId;
    const render = () => {
      const $purple = purpleRef.current;
      const $black = blackRef.current;
      const $orange = orangeRef.current;
      const $yellow = yellowRef.current;

      const $purpleEyes = purpleEyesRef.current;
      const $blackEyes = blackEyesRef.current;
      const $orangeEyes = orangeEyesRef.current;
      const $yellowEyes = yellowEyesRef.current;
      const $yellowMouth = yellowMouthRef.current;

      if (!$purple || !$black || !$orange || !$yellow || !$purpleEyes || !$blackEyes || !$orangeEyes || !$yellowEyes || !$yellowMouth) {
        animFrameId = requestAnimationFrame(render);
        return;
      }

      const pLength = passwordLengthRef.current;
      const sPw = showPasswordRef.current;

      const pp = calcPos($purple);
      const bp = calcPos($black);
      const op = calcPos($orange);
      const yp = calcPos($yellow);

      const isHiding = pLength > 0 && !sPw;
      const isShowingPw = pLength > 0 && sPw;

      // Purple body
      if (isShowingPw) {
        $purple.style.transform = 'skewX(0deg)';
        $purple.style.height = '400px';
      } else if (isTyping.current || isHiding) {
        $purple.style.transform = `skewX(${(pp.bodySkew || 0) - 12}deg) translateX(40px)`;
        $purple.style.height = '440px';
      } else {
        $purple.style.transform = `skewX(${pp.bodySkew || 0}deg)`;
        $purple.style.height = '400px';
      }

      // Purple eyes
      const purpleEyeL = $purpleEyes.children[0];
      const purpleEyeR = $purpleEyes.children[1];
      if (purpleEyeL && purpleEyeR) {
        purpleEyeL.style.height = purpleBlink.current ? '2px' : '18px';
        purpleEyeR.style.height = purpleBlink.current ? '2px' : '18px';
        let pfx, pfy;
        if (isShowingPw) {
          $purpleEyes.style.left = '20px';
          $purpleEyes.style.top = '35px';
          pfx = purplePeeking.current ? 4 : -4;
          pfy = purplePeeking.current ? 5 : -4;
        } else if (lookingAtEachOther.current) {
          $purpleEyes.style.left = '55px';
          $purpleEyes.style.top = '65px';
          pfx = 3;
          pfy = 4;
        } else {
          $purpleEyes.style.left = 45 + pp.faceX + 'px';
          $purpleEyes.style.top = 40 + pp.faceY + 'px';
          pfx = undefined;
          pfy = undefined;
        }
        setPupil(purpleEyeL, 5, pfx, pfy);
        setPupil(purpleEyeR, 5, pfx, pfy);
      }

      // Black body
      if (isShowingPw) {
        $black.style.transform = 'skewX(0deg)';
      } else if (lookingAtEachOther.current) {
        $black.style.transform = `skewX(${(bp.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)`;
      } else if (isTyping.current || isHiding) {
        $black.style.transform = `skewX(${(bp.bodySkew || 0) * 1.5}deg)`;
      } else {
        $black.style.transform = `skewX(${bp.bodySkew || 0}deg)`;
      }

      // Black eyes
      const blackEyeL = $blackEyes.children[0];
      const blackEyeR = $blackEyes.children[1];
      if (blackEyeL && blackEyeR) {
        blackEyeL.style.height = blackBlink.current ? '2px' : '16px';
        blackEyeR.style.height = blackBlink.current ? '2px' : '16px';
        let bfx, bfy;
        if (isShowingPw) {
          $blackEyes.style.left = '10px';
          $blackEyes.style.top = '28px';
          bfx = -4;
          bfy = -4;
        } else if (lookingAtEachOther.current) {
          $blackEyes.style.left = '32px';
          $blackEyes.style.top = '12px';
          bfx = 0;
          bfy = -4;
        } else {
          $blackEyes.style.left = 26 + bp.faceX + 'px';
          $blackEyes.style.top = 32 + bp.faceY + 'px';
          bfx = undefined;
          bfy = undefined;
        }
        setPupil(blackEyeL, 4, bfx, bfy);
        setPupil(blackEyeR, 4, bfx, bfy);
      }

      // Orange body
      $orange.style.transform = isShowingPw
        ? 'skewX(0deg)'
        : `skewX(${op.bodySkew || 0}deg)`;
      let ofx, ofy;
      if (isShowingPw) {
        $orangeEyes.style.left = '50px';
        $orangeEyes.style.top = '85px';
        ofx = -5;
        ofy = -4;
      } else {
        $orangeEyes.style.left = 82 + (op.faceX || 0) + 'px';
        $orangeEyes.style.top = 90 + (op.faceY || 0) + 'px';
        ofx = undefined;
        ofy = undefined;
      }
      if ($orangeEyes.children[0] && $orangeEyes.children[1]) {
        setPupilOnly($orangeEyes.children[0], 5, ofx, ofy);
        setPupilOnly($orangeEyes.children[1], 5, ofx, ofy);
      }

      // Yellow body
      $yellow.style.transform = isShowingPw
        ? 'skewX(0deg)'
        : `skewX(${yp.bodySkew || 0}deg)`;
      let yfx, yfy;
      if (isShowingPw) {
        $yellowEyes.style.left = '20px';
        $yellowEyes.style.top = '35px';
        $yellowMouth.style.left = '10px';
        $yellowMouth.style.top = '88px';
        yfx = -5;
        yfy = -4;
      } else {
        $yellowEyes.style.left = 52 + (yp.faceX || 0) + 'px';
        $yellowEyes.style.top = 40 + (yp.faceY || 0) + 'px';
        $yellowMouth.style.left = 40 + (yp.faceX || 0) + 'px';
        $yellowMouth.style.top = 88 + (yp.faceY || 0) + 'px';
        yfx = undefined;
        yfy = undefined;
      }
      if ($yellowEyes.children[0] && $yellowEyes.children[1]) {
        setPupilOnly($yellowEyes.children[0], 5, yfx, yfy);
        setPupilOnly($yellowEyes.children[1], 5, yfx, yfy);
      }

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cleanBlink1();
      cleanBlink2();
      clearInterval(peekInterval);
      clearTimeout(peekTimeout1);
      clearTimeout(peekTimeout2);
      cancelAnimationFrame(animFrameId);
    };
  }, []);

  return (
    <div className="login-page-container">
      {/* Dynamic styles to scope it perfectly and prevent Tailwind clashes */}
      <style>{`
        .login-page-container {
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background: #fff;
          color: #111;
          position: fixed;
          inset: 0;
          z-index: 9999;
        }
        .login-page-container *,
        .login-page-container *::before,
        .login-page-container *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        .login-page-container .page {
          display: grid;
          grid-template-columns: 1fr 1fr;
          height: 100vh;
          width: 100%;
        }
        .login-page-container .left {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 48px;
          background: linear-gradient(135deg, #9ca3af, #6b7280, #4b5563);
          color: #fff;
          overflow: hidden;
        }
        .login-page-container .blob1,
        .login-page-container .blob2 {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          pointer-events: none;
        }
        .login-page-container .blob1 {
          top: 25%;
          right: 25%;
          width: 256px;
          height: 256px;
          background: rgba(156, 163, 175, 0.2);
        }
        .login-page-container .blob2 {
          bottom: 25%;
          left: 25%;
          width: 384px;
          height: 384px;
          background: rgba(209, 213, 219, 0.2);
        }
        .login-page-container .grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            repeating-linear-gradient(
              0deg,
              rgba(255, 255, 255, 0.05) 0 1px,
              transparent 1px 20px
            ),
            repeating-linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.05) 0 1px,
              transparent 1px 20px
            );
          pointer-events: none;
        }
        .login-page-container .characters-wrap {
          position: relative;
          z-index: 20;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          height: 500px;
        }
        .login-page-container .characters {
          position: relative;
          width: 550px;
          height: 400px;
        }
        .login-page-container .char {
          position: absolute;
          bottom: 0;
          transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
          transform-origin: bottom center;
        }
        .login-page-container .char-purple {
          left: 70px;
          width: 180px;
          height: 400px;
          background: #6c3ff5;
          border-radius: 10px 10px 0 0;
          z-index: 1;
        }
        .login-page-container .char-purple .eyes-wrap {
          position: absolute;
          display: flex;
          gap: 32px;
          transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .login-page-container .char-black {
          left: 240px;
          width: 120px;
          height: 310px;
          background: #2d2d2d;
          border-radius: 8px 8px 0 0;
          z-index: 2;
        }
        .login-page-container .char-black .eyes-wrap {
          position: absolute;
          display: flex;
          gap: 24px;
          transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .login-page-container .char-orange {
          left: 0;
          width: 240px;
          height: 200px;
          background: #ff9b6b;
          border-radius: 120px 120px 0 0;
          z-index: 3;
        }
        .login-page-container .char-orange .eyes-wrap {
          position: absolute;
          display: flex;
          gap: 32px;
          transition: all 0.2s ease-out;
        }
        .login-page-container .char-yellow {
          left: 310px;
          width: 140px;
          height: 230px;
          background: #e8d754;
          border-radius: 70px 70px 0 0;
          z-index: 4;
        }
        .login-page-container .char-yellow .eyes-wrap {
          position: absolute;
          display: flex;
          gap: 24px;
          transition: all 0.2s ease-out;
        }
        .login-page-container .char-yellow .mouth {
          position: absolute;
          width: 80px;
          height: 4px;
          background: #2d2d2d;
          border-radius: 4px;
          transition: all 0.2s ease-out;
        }
        .login-page-container .eyeball {
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          transition: height 0.15s;
          background: #fff;
        }
        .login-page-container .eyeball .pupil {
          border-radius: 50%;
          background: #2d2d2d;
          transition: transform 0.1s ease-out;
        }
        .login-page-container .pupil-only {
          border-radius: 50%;
          background: #2d2d2d;
          transition: transform 0.1s ease-out;
        }
        .login-page-container .right {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          background: #fff;
        }
        .login-page-container .form-box {
          width: 100%;
          max-width: 420px;
        }
        .login-page-container .form-box .header {
          text-align: center;
          margin-bottom: 40px;
        }
        .login-page-container .form-box .header h1 {
          font-size: 30px;
          font-weight: 700;
          letter-spacing: -0.5px;
          margin-bottom: 8px;
          color: #111;
        }
        .login-page-container .form-box .header p {
          color: #6b7280;
          font-size: 14px;
        }
        .login-page-container .field {
          margin-bottom: 20px;
          text-align: left;
        }
        .login-page-container .field label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 6px;
          color: #111;
        }
        .login-page-container .field input {
          width: 100%;
          height: 48px;
          padding: 0 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 15px;
          outline: none;
          transition: border-color 0.2s;
          background: #fff;
          color: #111;
        }
        .login-page-container .field input:focus {
          border-color: #111;
        }
        .login-page-container .field .input-wrap {
          position: relative;
        }
        .login-page-container .field .input-wrap input {
          padding-right: 44px;
        }
        .login-page-container .toggle-pw {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 2;
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          transition: color 0.2s;
          padding: 4px;
        }
        .login-page-container .toggle-pw:hover {
          color: #111;
        }
        .login-page-container .toggle-pw svg {
          width: 20px;
          height: 20px;
          pointer-events: none;
        }
        .login-page-container .row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .login-page-container .row .remember {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          cursor: pointer;
          color: #111;
        }
        .login-page-container .row .remember input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: #111;
          cursor: pointer;
        }
        .login-page-container .row a {
          font-size: 14px;
          font-weight: 500;
          color: #111;
          text-decoration: none;
        }
        .login-page-container .row a:hover {
          text-decoration: underline;
        }
        .login-page-container .hover-btn {
          position: relative;
          width: 100%;
          height: 48px;
          border-radius: 9999px;
          border: 1px solid #e5e7eb;
          background: #fff;
          cursor: pointer;
          overflow: hidden;
          font-size: 16px;
          font-weight: 600;
          color: #111;
          outline: none;
        }
        .login-page-container .hover-btn .label {
          display: inline-block;
          transition: all 0.3s;
        }
        .login-page-container .hover-btn .overlay {
          position: absolute;
          inset: 0;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #111;
          color: #fff;
          border-radius: 9999px;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .login-page-container .hover-btn:hover .label {
          transform: translateX(48px);
          opacity: 0;
        }
        .login-page-container .hover-btn:hover .overlay {
          opacity: 1;
        }
        .login-page-container .divider {
          text-align: center;
          margin-top: 32px;
          font-size: 14px;
          color: #6b7280;
        }
        .login-page-container .divider a {
          color: #111;
          font-weight: 500;
          text-decoration: none;
        }
        .login-page-container .divider a:hover {
          text-decoration: underline;
        }
        .login-page-container .arrow-icon {
          width: 16px;
          height: 16px;
        }
        .login-page-container .error-box {
          background-color: #fef2f2;
          border: 1px solid #fee2e2;
          color: #b91c1c;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 16px;
          text-align: left;
        }
        @media (max-width: 1024px) {
          .login-page-container {
            height: auto;
            overflow: auto;
          }
          .login-page-container .page {
            grid-template-columns: 1fr;
            height: auto;
            min-height: 100vh;
          }
          .login-page-container .left {
            padding: 24px 16px 0;
          }
          .login-page-container .characters-wrap {
            height: 220px;
          }
          .login-page-container .characters {
            transform: scale(0.45);
            transform-origin: bottom center;
          }
          .login-page-container .right {
            padding: 24px 20px 40px;
          }
          .login-page-container .form-box .header {
            margin-bottom: 24px;
          }
        }
        .login-page-container .demo-credentials {
          margin-top: 16px;
          padding: 12px 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-size: 13px;
          color: #64748b;
          text-align: left;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .login-page-container .demo-credentials strong {
          color: #334155;
          display: block;
          margin-bottom: 6px;
        }
        .login-page-container .demo-credential-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 4px;
        }
        .login-page-container .demo-label {
          font-weight: 500;
        }
        .login-page-container .demo-value {
          font-family: monospace;
          background: #f1f5f9;
          color: #0f172a;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }
        .login-page-container .demo-value:hover {
          background: #e2e8f0;
          color: #000;
          transform: translateY(-1px);
        }
        .login-page-container .demo-hint {
          display: block;
          margin-top: 8px;
          font-size: 11px;
          color: #94a3b8;
          text-align: center;
        }
      `}</style>

      <div className="page">
        <div className="left">
          <div className="characters-wrap">
            <div className="characters" id="characters">
              <div className="char char-purple" id="purple" ref={purpleRef}>
                <div className="eyes-wrap" id="purple-eyes" ref={purpleEyesRef}>
                  <div className="eyeball" id="purple-eye-l" style={{ width: '18px', height: '18px' }}>
                    <div className="pupil" style={{ width: '7px', height: '7px' }}></div>
                  </div>
                  <div className="eyeball" id="purple-eye-r" style={{ width: '18px', height: '18px' }}>
                    <div className="pupil" style={{ width: '7px', height: '7px' }}></div>
                  </div>
                </div>
              </div>
              <div className="char char-black" id="black" ref={blackRef}>
                <div className="eyes-wrap" id="black-eyes" ref={blackEyesRef}>
                  <div className="eyeball" id="black-eye-l" style={{ width: '16px', height: '16px' }}>
                    <div className="pupil" style={{ width: '6px', height: '6px' }}></div>
                  </div>
                  <div className="eyeball" id="black-eye-r" style={{ width: '16px', height: '16px' }}>
                    <div className="pupil" style={{ width: '6px', height: '6px' }}></div>
                  </div>
                </div>
              </div>
              <div className="char char-orange" id="orange" ref={orangeRef}>
                <div className="eyes-wrap" id="orange-eyes" ref={orangeEyesRef}>
                  <div className="pupil-only" style={{ width: '12px', height: '12px' }}></div>
                  <div className="pupil-only" style={{ width: '12px', height: '12px' }}></div>
                </div>
              </div>
              <div className="char char-yellow" id="yellow" ref={yellowRef}>
                <div className="eyes-wrap" id="yellow-eyes" ref={yellowEyesRef}>
                  <div className="pupil-only" style={{ width: '12px', height: '12px' }}></div>
                  <div className="pupil-only" style={{ width: '12px', height: '12px' }}></div>
                </div>
                <div className="mouth" id="yellow-mouth" ref={yellowMouthRef}></div>
              </div>
            </div>
          </div>
          <div className="grid-overlay"></div>
          <div className="blob1"></div>
          <div className="blob2"></div>
        </div>
        <div className="right">
          <div className="form-box">
            <div className="header">
              <h1>Welcome Back!</h1>
              <p>Please enter your login information</p>
              <div className="demo-credentials">
                <strong>Demo Credentials:</strong>
                <div className="demo-credential-item">
                  <span className="demo-label">Email:</span>
                  <span className="demo-value" title="Click to fill" onClick={() => setEmail('admin@library.com')}>
                    admin@library.com
                  </span>
                </div>
                <div className="demo-credential-item">
                  <span className="demo-label">Password:</span>
                  <span className="demo-value" title="Click to fill" onClick={() => setPassword('password123')}>
                    password123
                  </span>
                </div>
                <span className="demo-hint">(Click any credential to autofill)</span>
              </div>
            </div>
            
            {error && (
              <div className="error-box">
                {error}
              </div>
            )}

            <form id="loginForm" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <div className="input-wrap">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                  <button
                    type="button"
                    className="toggle-pw"
                    id="togglePw"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {!showPassword ? (
                      <svg
                        id="eyeIcon"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                         />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />
                      </svg>
                    ) : (
                      <svg
                        id="eyeOffIcon"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="hover-btn">
                <span className="label">Sign In</span>
                <div className="overlay">
                  <span>Sign In</span>
                  <svg
                    className="arrow-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                    />
                  </svg>
                </div>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
