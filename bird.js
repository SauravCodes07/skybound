import { SKINS } from './storage.js';

const PALETTES = {
  azure: { body: '#5ee7ff', shade: '#2f9fe3', wing: '#c8f8ff', accent: '#6558ff' },
  sunset: { body: '#ff8a5c', shade: '#e84d62', wing: '#ffd3a5', accent: '#8e3d75' },
  mint: { body: '#62f5b0', shade: '#1bbf8b', wing: '#d8ffe8', accent: '#167c8c' },
  royal: { body: '#9b7bff', shade: '#6547d8', wing: '#eee6ff', accent: '#ff78c7' },
  ember: { body: '#ff4f73', shade: '#be204c', wing: '#ffc05f', accent: '#6f1e5b' },
  gold: { body: '#ffd45d', shade: '#db892e', wing: '#fff5c7', accent: '#b85b28' }
};

export class Bird {
  constructor(width, height, skin = 'azure') {
    this.radius = 17;
    this.skin = skin;
    this.reset(width, height);
  }

  reset(width, height) {
    this.x = width * .29;
    this.y = height * .43;
    this.velocity = 0;
    this.rotation = 0;
    this.wingPhase = 0;
    this.trailTimer = 0;
    this.alive = true;
  }

  setSkin(skin) {
    if (SKINS.some(item => item.id === skin)) this.skin = skin;
  }

  flap() {
    if (!this.alive) return;
    this.velocity = -390;
    this.rotation = -.38;
    this.wingPhase = 0;
  }

  update(delta, worldHeight, active = true) {
    this.wingPhase += delta * (active ? 14 : 5);
    if (!active) {
      this.y += Math.sin(this.wingPhase * .55) * 7 * delta;
      return;
    }
    this.velocity += 1160 * delta;
    this.velocity = Math.min(this.velocity, 680);
    this.y += this.velocity * delta;
    const targetRotation = Math.min(.92, Math.max(-.45, this.velocity / 650));
    this.rotation += (targetRotation - this.rotation) * Math.min(1, delta * 8);
    this.trailTimer += delta;
    if (this.y < -this.radius) {
      this.y = -this.radius;
      this.velocity = Math.max(80, this.velocity);
    }
    if (this.y > worldHeight + 100) this.alive = false;
  }

  getHitCircle() {
    return { x: this.x - 1, y: this.y + 1, radius: this.radius * .72 };
  }

  draw(context, time, slowMotion = false) {
    const palette = PALETTES[this.skin] || PALETTES.azure;
    const wingLift = Math.sin(this.wingPhase) * 8;
    context.save();
    context.translate(this.x, this.y);
    context.rotate(this.rotation);

    if (slowMotion) {
      context.beginPath();
      context.arc(0, 0, 29 + Math.sin(time * .006) * 2, 0, Math.PI * 2);
      context.strokeStyle = 'rgba(102,235,255,.48)';
      context.lineWidth = 2;
      context.shadowBlur = 15;
      context.shadowColor = '#65eaff';
      context.stroke();
      context.shadowBlur = 0;
    }

    context.fillStyle = 'rgba(3,10,18,.22)';
    context.beginPath();
    context.ellipse(-1, 18, 20, 7, 0, 0, Math.PI * 2);
    context.fill();

    const bodyGradient = context.createLinearGradient(-20, -15, 18, 18);
    bodyGradient.addColorStop(0, '#ffffff');
    bodyGradient.addColorStop(.18, palette.body);
    bodyGradient.addColorStop(1, palette.shade);
    context.fillStyle = bodyGradient;
    context.beginPath();
    context.ellipse(0, 0, 21, 17, -.05, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = palette.wing;
    context.beginPath();
    context.ellipse(-9, 3 + wingLift * .45, 13, 7, -.2 + wingLift * .02, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(5,32,52,.15)';
    context.lineWidth = 1.5;
    context.stroke();

    context.fillStyle = '#fff';
    context.beginPath();
    context.arc(11, -6, 7.2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#07111f';
    context.beginPath();
    context.arc(13.2, -6, 3.3, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#fff';
    context.beginPath();
    context.arc(14.3, -7.2, 1, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = palette.accent;
    context.beginPath();
    context.moveTo(18, 0);
    context.lineTo(31, 4);
    context.lineTo(18, 9);
    context.closePath();
    context.fill();
    context.restore();
  }
}
