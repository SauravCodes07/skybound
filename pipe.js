const circleRectCollision = (circle, rect) => {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
  const deltaX = circle.x - closestX;
  const deltaY = circle.y - closestY;
  return deltaX * deltaX + deltaY * deltaY < circle.radius * circle.radius;
};

export class PipePair {
  constructor(x, gapY, gapSize, width, worldHeight, options = {}) {
    this.x = x;
    this.gapY = gapY;
    this.gapSize = gapSize;
    this.width = width;
    this.worldHeight = worldHeight;
    this.golden = Boolean(options.golden);
    this.powerup = Boolean(options.powerup);
    this.powerupCollected = false;
    this.scored = false;
    this.pulse = Math.random() * Math.PI * 2;
  }

  update(delta, speed) {
    this.x -= speed * delta;
    this.pulse += delta * 3;
  }

  get topHeight() { return this.gapY - this.gapSize * .5; }
  get bottomY() { return this.gapY + this.gapSize * .5; }
  get isOffscreen() { return this.x + this.width + 16 < 0; }

  collides(circle, groundY) {
    const lip = 8;
    const top = { x: this.x - lip, y: 0, width: this.width + lip * 2, height: this.topHeight };
    const bottom = { x: this.x - lip, y: this.bottomY, width: this.width + lip * 2, height: groundY - this.bottomY };
    return circleRectCollision(circle, top) || circleRectCollision(circle, bottom);
  }

  collectPowerup(circle) {
    if (!this.powerup || this.powerupCollected) return false;
    const orbX = this.x + this.width * .5;
    const deltaX = circle.x - orbX;
    const deltaY = circle.y - this.gapY;
    if (deltaX * deltaX + deltaY * deltaY < (circle.radius + 14) ** 2) {
      this.powerupCollected = true;
      return true;
    }
    return false;
  }

  draw(context, groundY, time) {
    const topHeight = this.topHeight;
    const bottomY = this.bottomY;
    const capHeight = 28;
    const capOverhang = 8;
    const base = this.golden ? '#e7a92e' : '#28a982';
    const light = this.golden ? '#ffe882' : '#78ebad';
    const dark = this.golden ? '#9c5b16' : '#126b63';

    context.save();
    context.shadowColor = 'rgba(1,8,14,.32)';
    context.shadowBlur = 13;
    context.shadowOffsetX = 7;
    const gradient = context.createLinearGradient(this.x, 0, this.x + this.width, 0);
    gradient.addColorStop(0, dark);
    gradient.addColorStop(.22, base);
    gradient.addColorStop(.5, light);
    gradient.addColorStop(.8, base);
    gradient.addColorStop(1, dark);
    context.fillStyle = gradient;
    context.fillRect(this.x, 0, this.width, Math.max(0, topHeight - capHeight));
    context.fillRect(this.x, bottomY + capHeight, this.width, Math.max(0, groundY - bottomY - capHeight));
    this.roundedRect(context, this.x - capOverhang, topHeight - capHeight, this.width + capOverhang * 2, capHeight, 7);
    context.fill();
    this.roundedRect(context, this.x - capOverhang, bottomY, this.width + capOverhang * 2, capHeight, 7);
    context.fill();

    context.shadowBlur = 0;
    context.fillStyle = 'rgba(255,255,255,.19)';
    context.fillRect(this.x + 9, 0, 5, Math.max(0, topHeight - capHeight));
    context.fillRect(this.x + 9, bottomY + capHeight, 5, Math.max(0, groundY - bottomY - capHeight));

    if (this.golden) {
      context.globalAlpha = .6 + Math.sin(this.pulse) * .2;
      context.strokeStyle = '#fff3a6';
      context.lineWidth = 2;
      context.strokeRect(this.x + 2, 0, this.width - 4, Math.max(0, topHeight - capHeight));
      context.strokeRect(this.x + 2, bottomY + capHeight, this.width - 4, Math.max(0, groundY - bottomY - capHeight));
    }

    if (this.powerup && !this.powerupCollected) {
      const orbX = this.x + this.width * .5;
      const radius = 11 + Math.sin(time * .006 + this.pulse) * 1.5;
      const glow = context.createRadialGradient(orbX, this.gapY, 1, orbX, this.gapY, 25);
      glow.addColorStop(0, '#fff');
      glow.addColorStop(.22, '#76efff');
      glow.addColorStop(.45, 'rgba(67,187,255,.7)');
      glow.addColorStop(1, 'rgba(50,150,255,0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(orbX, this.gapY, 27, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#d6fbff';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(orbX, this.gapY, radius, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.moveTo(orbX, this.gapY - 6);
      context.lineTo(orbX, this.gapY);
      context.lineTo(orbX + 5, this.gapY + 3);
      context.stroke();
    }
    context.restore();
  }

  roundedRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
  }
}

export class PipeManager {
  constructor(width, height) {
    this.resize(width, height);
    this.pipes = [];
    this.spawnTimer = 0;
    this.spawnCount = 0;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.groundY = height - Math.max(72, height * .105);
  }

  reset() {
    this.pipes.length = 0;
    this.spawnTimer = .7;
    this.spawnCount = 0;
  }

  update(delta, score, speedFactor = 1) {
    const difficulty = Math.min(1, score / 65);
    const speed = (158 + difficulty * 92) * speedFactor;
    const interval = 1.58 - difficulty * .31;
    this.spawnTimer += delta * speedFactor;
    if (this.spawnTimer >= interval) {
      this.spawnTimer = 0;
      this.spawn(score);
    }
    this.pipes.forEach(pipe => pipe.update(delta, speed));
    while (this.pipes[0]?.isOffscreen) this.pipes.shift();
  }

  spawn(score) {
    const difficulty = Math.min(1, score / 65);
    const gapSize = Math.max(124, Math.min(178, this.height * .225) - difficulty * 42);
    const margin = 75 + gapSize * .5;
    const usable = this.groundY - margin * 2;
    const wave = Math.sin(this.spawnCount * .83) * usable * .16;
    const gapY = margin + usable * (.5 + (Math.random() - .5) * .58) + wave;
    const golden = score >= 4 && Math.random() < Math.min(.18, .07 + score * .0015);
    const powerup = score >= 6 && !golden && Math.random() < .115;
    this.pipes.push(new PipePair(this.width + 45, Math.max(margin, Math.min(this.groundY - margin, gapY)), golden ? gapSize - 8 : gapSize, Math.max(54, this.width * .125), this.height, { golden, powerup }));
    this.spawnCount += 1;
  }

  draw(context, time) {
    this.pipes.forEach(pipe => pipe.draw(context, this.groundY, time));
  }
}
