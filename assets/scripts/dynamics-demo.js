/* One initial write, then homogeneous state evolution with a shared decay. */
(() => {
  const demo = document.getElementById('state-dynamics-demo');
  if (!demo) return;

  const get = (id) => demo.querySelector(`#state-${id}`);
  const play = get('demo-play');
  const reset = get('demo-reset');
  const decayInput = get('demo-decay');
  const speedInput = get('demo-speed');
  const decayValue = get('demo-decay-value');
  const speedValue = get('demo-speed-value');
  const normLabel = get('demo-norm');
  const timeLabel = get('demo-time');
  const status = get('demo-status');
  const decayArrow = get('decay-arrow');
  const oscillationArrow = get('oscillation-arrow');
  const decayTrail = get('decay-trail');
  const oscillationTrail = get('oscillation-trail');
  const duration = 12;
  const angularSpeed = 2 * Math.PI / 8;
  let time = 0;
  let playing = false;
  let visible = true;
  let frameId = null;
  let previousTimestamp = null;

  const render = () => {
    const decay = Number(decayInput.value);
    const speed = Number(speedInput.value);
    const norm = Math.exp(-decay * time);
    const phase = angularSpeed * speed * time;

    decayArrow.setAttribute('transform', `translate(150 110) scale(${norm})`);
    oscillationArrow.setAttribute('transform', `translate(150 110) rotate(${-phase * 180 / Math.PI}) scale(${norm})`);
    decayTrail.setAttribute('d', `M232 110L${150 + 82 * norm} 110`);

    const points = [];
    const steps = Math.max(1, Math.ceil(time * 24));
    for (let i = 0; i <= steps; i++) {
      const t = time * i / steps;
      const radius = 82 * Math.exp(-decay * t);
      const angle = angularSpeed * speed * t;
      points.push(`${i ? 'L' : 'M'}${(150 + radius * Math.cos(angle)).toFixed(2)} ${(110 - radius * Math.sin(angle)).toFixed(2)}`);
    }
    oscillationTrail.setAttribute('d', points.join(''));

    normLabel.textContent = norm.toFixed(2);
    timeLabel.textContent = time.toFixed(1);
    decayValue.value = decay.toFixed(2);
    speedValue.value = `${speed.toFixed(1)}×`;
    decayInput.setAttribute('aria-valuetext', decay === 0 ? '0, no decay' : decay.toFixed(2));
    speedInput.setAttribute('aria-valuetext', speed === 0 ? '0, no rotation' : `${speed.toFixed(1)} times`);
  };

  const updateButton = () => {
    play.textContent = playing ? 'Pause' : time >= duration ? 'Replay' : 'Play';
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
      time = Math.min(duration, time + Math.min((timestamp - previousTimestamp) / 1000, 0.1));
    }
    previousTimestamp = timestamp;
    render();
    if (time >= duration) {
      playing = false;
      previousTimestamp = null;
      updateButton();
      status.textContent = 'Finished. Replay or change the parameters to compare the dynamics.';
    } else {
      schedule();
    }
  };

  play.addEventListener('click', () => {
    playing = !playing;
    if (playing && time >= duration) time = 0;
    stopFrame();
    render();
    updateButton();
    status.textContent = playing ? 'Playing decay and oscillation.' : `Paused at time ${time.toFixed(1)}. Both states have norm ${normLabel.textContent}.`;
    schedule();
  });

  reset.addEventListener('click', () => {
    playing = false;
    time = 0;
    decayInput.value = decayInput.defaultValue;
    speedInput.value = speedInput.defaultValue;
    stopFrame();
    render();
    updateButton();
    status.textContent = 'Reset to the initial signal and default parameters.';
  });

  [decayInput, speedInput].forEach((input) => {
    input.addEventListener('input', render);
    input.addEventListener('change', () => {
      status.textContent = `Parameters updated. At time ${time.toFixed(1)}, both states have norm ${normLabel.textContent}.`;
    });
  });

  // Start only on request, including for readers who prefer reduced motion.
  // Suspend work off-screen and in background tabs without advancing time.
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
  demo.querySelector('.state-demo-controls').hidden = false;
})();
