/* Linear readouts of one fixed oscillatory pair versus two independent pairs. */
(() => {
  const demo = document.getElementById('pair-limit-demo');
  if (!demo) return;

  const controls = demo.querySelector('.pair-demo-controls');
  const speedControls = demo.querySelector('.pair-demo-speed-controls');
  const speed = demo.querySelector('#pair-demo-speed');
  const speedValue = demo.querySelector('#pair-demo-speed-value');
  const status = demo.querySelector('#pair-demo-status');
  const readoutLabel = demo.querySelector('#pair-demo-readout-label');
  const modeButtons = [...demo.querySelectorAll('[data-pair-mode]')];
  const plots = [...demo.querySelectorAll('[data-target-angle]')];
  const retention = 0.98;
  const horizon = 24;
  let mode = 'one';

  const trace = (degrees) => {
    const angle = degrees * Math.PI / 180;
    const points = [];
    for (let sample = 0; sample <= 96; sample++) {
      const step = horizon * sample / 96;
      const x = 30 + 318 * step / horizon;
      const y = 76 - 48 * retention ** step * Math.cos(angle * step);
      points.push(`${sample ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    return points.join(' ');
  };

  const render = () => {
    const sharedAngle = Number(speed.value);
    const independent = mode === 'two';
    const matches = [];
    plots.forEach((plot) => {
      const targetAngle = Number(plot.dataset.targetAngle);
      const readoutAngle = independent ? targetAngle : sharedAngle;
      const matching = readoutAngle === targetAngle;
      plot.querySelector('.pair-demo-target').setAttribute('d', trace(targetAngle));
      plot.querySelector('.pair-demo-readout').setAttribute('d', trace(readoutAngle));
      plot.querySelector('.pair-demo-match').textContent = matching ? 'Matches' : 'Different frequency';
      plot.dataset.matching = String(matching);
      plot.querySelector('desc').textContent =
        `Target ${plot.dataset.signal} rotates ${targetAngle} degrees per step. ` +
        `The readout rotates ${readoutAngle} degrees per step. ` +
        (matching ? 'The two curves match.' : 'The readout has a different frequency.');
      matches.push(matching);
    });

    modeButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.pairMode === mode));
    });
    speedControls.hidden = independent;
    speedValue.value = `${sharedAngle}° / step`;
    speed.setAttribute('aria-valuetext', `${sharedAngle} degrees per step`);
    readoutLabel.textContent = independent ? 'Two-pair readouts' : 'One-pair readouts';
    status.textContent = independent
      ? 'Both targets match: each pair has its own rotation speed.'
      : matches[0]
        ? 'A matches. B needs a different frequency.'
        : matches[1]
          ? 'B matches. A needs a different frequency.'
          : 'Both targets differ from the shared frequency.';
    demo.dataset.mode = mode;
  };

  modeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      mode = button.dataset.pairMode;
      render();
    });
  });
  demo.querySelectorAll('[data-match-angle]').forEach((button) => {
    button.addEventListener('click', () => {
      speed.value = button.dataset.matchAngle;
      render();
    });
  });
  speed.addEventListener('input', render);

  render();
  controls.hidden = false;
})();
