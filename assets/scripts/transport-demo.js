/* The same five-slot state and its real Fourier coordinates, with and without shift. */
(() => {
  const demo = document.getElementById('transport-demo');
  if (!demo) return;

  const play = demo.querySelector('#transport-demo-play');
  const reset = demo.querySelector('#transport-demo-reset');
  const stepInput = demo.querySelector('#transport-demo-step');
  const shiftInput = demo.querySelector('#transport-demo-shift');
  const stepValue = demo.querySelector('#transport-demo-step-value');
  const shiftValue = demo.querySelector('#transport-demo-shift-value');
  const normValue = demo.querySelector('#transport-demo-norm');
  const status = demo.querySelector('#transport-demo-status');
  const slots = 5;
  const retention = 0.95;
  const duration = 10;
  const radius = 72;
  const initialValues = [1, 0, 0, 0, 0];
  const initialNorm = Math.hypot(...initialValues);
  const initialState = initialValues.map((value) => value / initialNorm);
  const basisScale = Math.sqrt(2 / slots);
  const initialDC = initialState.reduce((sum, value) => sum + value, 0) / Math.sqrt(slots);
  const initialModes = [1, 2].map((mode) => ({
    cosine: initialState.reduce((sum, value, slot) =>
      sum + basisScale * value * Math.cos(2 * Math.PI * mode * slot / slots), 0),
    sine: initialState.reduce((sum, value, slot) =>
      sum + basisScale * value * Math.sin(2 * Math.PI * mode * slot / slots), 0),
  }));
  const plotScale = radius / Math.max(...initialModes.map(({ cosine, sine }) => Math.hypot(cosine, sine)));
  const modeAt = (mode, delta, n) => {
    const initial = initialModes[mode - 1];
    const angle = 2 * Math.PI * mode * delta * n / slots;
    const decay = retention ** n;
    return {
      cosine: decay * (initial.cosine * Math.cos(angle) - initial.sine * Math.sin(angle)),
      sine: decay * (initial.cosine * Math.sin(angle) + initial.sine * Math.cos(angle)),
    };
  };
  let step = Number(stepInput.value);
  let playing = false;
  let visible = true;
  let frameId = null;
  let previousTimestamp = null;

  const render = () => {
    const shift = Number(shiftInput.value);
    const norm = retention ** step;
    ['still', 'shifted'].forEach((condition) => {
      const delta = condition === 'still' ? 0 : shift;
      const slotPanel = demo.querySelector(`[data-slot-condition="${condition}"]`);
      const currentModes = [1, 2].map((mode) => modeAt(mode, delta, step));
      const values = Array.from({ length: slots }, (_, slot) => {
        let value = norm * initialDC / Math.sqrt(slots);
        currentModes.forEach((pair, index) => {
          const angle = 2 * Math.PI * (index + 1) * slot / slots;
          value += basisScale * (pair.cosine * Math.cos(angle) + pair.sine * Math.sin(angle));
        });
        return value;
      });
      slotPanel.querySelectorAll('[data-slot]').forEach((bar, slot) => {
        const value = Math.abs(values[slot]) < 1e-12 ? 0 : values[slot];
        const height = Math.abs(value) * 62;
        bar.setAttribute('y', (value >= 0 ? 92 - height : 92).toFixed(3));
        bar.setAttribute('height', height.toFixed(3));
        bar.setAttribute('data-value', value.toFixed(6));
      });
      slotPanel.querySelector('desc').textContent =
        `${condition === 'still' ? 'No shift' : 'Cyclic shift'} at step ${step.toFixed(1)}. ` +
        values.map((value, slot) => `Slot ${slot}: ${value.toFixed(3)}`).join('. ');

      const fourierPanel = demo.querySelector(`[data-fourier-condition="${condition}"]`);
      fourierPanel.querySelectorAll('[data-fourier-mode]').forEach((group) => {
        const mode = Number(group.dataset.fourierMode);
        const angularSpeed = 2 * Math.PI * mode * delta / slots;
        const phase = angularSpeed * step;
        const pair = currentModes[mode - 1];
        const endpointX = 150 + plotScale * pair.cosine;
        const endpointY = 105 - plotScale * pair.sine;
        const arrow = group.querySelector('.transport-demo-vector');
        arrow.setAttribute('x2', endpointX.toFixed(3));
        arrow.setAttribute('y2', endpointY.toFixed(3));
        group.querySelector('.transport-demo-endpoint').setAttribute('cx', endpointX.toFixed(3));
        group.querySelector('.transport-demo-endpoint').setAttribute('cy', endpointY.toFixed(3));
        // Actual orthonormal Fourier coordinates, before the shared plot scaling.
        group.setAttribute('data-cosine', pair.cosine.toFixed(6));
        group.setAttribute('data-sine', pair.sine.toFixed(6));
        group.setAttribute('data-phase', phase.toFixed(6));
        const points = [];
        const samples = Math.max(1, Math.ceil(step * 24));
        for (let sample = 0; sample <= samples; sample++) {
          const n = step * sample / samples;
          const point = modeAt(mode, delta, n);
          points.push(`${sample ? 'L' : 'M'}${(150 + plotScale * point.cosine).toFixed(3)} ${(105 - plotScale * point.sine).toFixed(3)}`);
        }
        group.querySelector('.transport-demo-trail').setAttribute('d', points.join(' '));
      });
      fourierPanel.querySelector('desc').textContent =
        condition === 'still'
          ? `Both Fourier pairs shrink to ${(100 * norm).toFixed(1)} percent of their initial length without rotating.`
          : `Both Fourier pairs shrink to ${(100 * norm).toFixed(1)} percent of their initial length. ` +
            `Pair one has rotated ${(360 * shift * step / slots).toFixed(1)} degrees from its initial direction. ` +
            `Pair two has rotated ${(720 * shift * step / slots).toFixed(1)} degrees from its initial direction.`;
    });
    demo.querySelector('#transport-demo-dc').textContent = (norm * initialDC).toFixed(2);
    demo.dataset.step = step.toFixed(6);
    demo.dataset.shift = shift.toFixed(2);
    normValue.textContent = norm.toFixed(2);
    stepInput.value = step.toFixed(1);
    stepValue.value = step.toFixed(1);
    shiftValue.value = `${shift.toFixed(2)} slots / step`;
    stepInput.setAttribute('aria-valuetext', `Step ${step.toFixed(1)} of ${duration}`);
    shiftInput.setAttribute('aria-valuetext', `${shift.toFixed(2)} slots per step`);
  };

  const updateButton = () => {
    play.textContent = playing ? 'Pause' : step >= duration ? 'Replay' : 'Play';
  };
  const stopFrame = () => {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    previousTimestamp = null;
  };
  const schedule = () => {
    if (playing && visible && !document.hidden && frameId === null) {
      frameId = requestAnimationFrame(tick);
    }
  };
  const tick = (timestamp) => {
    frameId = null;
    if (!playing || !visible || document.hidden) {
      previousTimestamp = null;
      return;
    }
    if (previousTimestamp !== null) {
      step = Math.min(duration, step + Math.min((timestamp - previousTimestamp) / 1000, 0.1));
    }
    previousTimestamp = timestamp;
    render();
    if (step >= duration) {
      playing = false;
      previousTimestamp = null;
      updateButton();
      status.textContent = 'Finished. Replay or move the step slider to compare the two coordinate systems.';
    } else {
      schedule();
    }
  };
  play.addEventListener('click', () => {
    playing = !playing;
    if (playing && step >= duration) step = 0;
    stopFrame();
    render();
    updateButton();
    status.textContent = playing ? 'Playing the same state in slot and Fourier coordinates.' : `Paused at step ${step.toFixed(1)}.`;
    schedule();
  });
  reset.addEventListener('click', () => {
    playing = false;
    step = 0;
    shiftInput.value = shiftInput.defaultValue;
    stopFrame();
    render();
    updateButton();
    status.textContent = 'Reset to a single write in slot zero.';
  });
  stepInput.addEventListener('input', () => {
    playing = false;
    step = Number(stepInput.value);
    stopFrame();
    render();
    updateButton();
  });
  shiftInput.addEventListener('input', render);
  [stepInput, shiftInput].forEach((input) => {
    input.addEventListener('change', () => {
      status.textContent = `Step ${step.toFixed(1)}. Both states have norm ${normValue.textContent}. The right state shifts ${Number(shiftInput.value).toFixed(2)} slots per step.`;
    });
  });
  // Playback is opt-in, including with reduced motion, and pauses its clock off-screen.
  document.addEventListener('visibilitychange', () => {
    stopFrame();
    schedule();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      stopFrame();
      schedule();
    }).observe(demo);
  }
  render();
  demo.querySelector('.transport-demo-controls').hidden = false;
})();
