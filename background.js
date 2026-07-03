const lerp = (start, end, amount) => start + (end - start) * amount;
const mixColor = (first, second, amount) => {
  const parse = color => color.match(/\w\w/g).map(value => parseInt(value, 16));
  const a = parse(first);
  const b = parse(second);
  return `rgb(${Math.round(lerp(a[0], b[0], amount))},${Math.round(lerp(a[1], b[1], amount))},${Math.round(lerp(a[2], b[2], amount))})`;
};

export class Background {
  constructor(width, height) {
    this.time = 0;
    this.distance = 0;
    this.weather = 'clear';
    this.weatherTimer = 22;
    this.resize(width, height);
    this.createScenery();
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.groundY = height - Math.max(72, height * .105);
  }

  createScenery() {
    this.clouds = Array.from({ length: 8 }, (_, index) => ({
      x: Math.random() * this.width,
      y: 65 + Math.random() * this.height * .5,
      size: 28 + Math.random() * 52,
      speed: 5 + Math.random() * 10,
      alpha: .14 + Math.random() * .26,
      layer: index % 2
    }));
    this.stars = Array.from({ length: 55 }, () => ({ x: Math.random(), y: Math.random() * .72, size: .6 + Math.random() * 1.5, phase: Math.random() * 6.28 }));
    this.rain = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), speed: .7 + Math.random() * .8, length: 8 + Math.random() * 12 }));
  }

  update(delta, movement = 1) {
    this.time += delta;
    this.distance += delta * movement;
    this.weatherTimer -= delta;
    if (this.weatherTimer <= 0) {
      this.weather = Math.random() < .28 ? 'rain' : 'clear';
      this.weatherTimer = 22 + Math.random() * 25;
    }
    this.clouds.forEach(cloud => {
      cloud.x -= cloud.speed * delta * movement;
      if (cloud.x < -cloud.size * 2.4) {
        cloud.x = this.width + cloud.size * 2;
        cloud.y = 55 + Math.random() * this.height * .5;
      }
    });
    if (this.weather === 'rain') {
      this.rain.forEach(drop => {
        drop.y += drop.speed * delta;
        drop.x -= drop.speed * delta * .2;
        if (drop.y > 1.05) { drop.y = -.05; drop.x = Math.random(); }
        if (drop.x < -.05) drop.x = 1.05;
      });
    }
  }

  getCycle() {
    const cycle = (this.time / 48) % 1;
    const daylight = Math.max(0, Math.sin(cycle * Math.PI * 2 - Math.PI * .5) * .5 + .5);
    const sunset = Math.max(0, 1 - Math.abs(cycle - .71) * 9);
    return { cycle, daylight, sunset };
  }

  draw(context) {
    const { cycle, daylight, sunset } = this.getCycle();
    const nightTop = '#07142b';
    const dayTop = '#289ed1';
    const nightBottom = '#163253';
    const dayBottom = '#b8eff0';
    let top = mixColor(nightTop, dayTop, daylight);
    let bottom = mixColor(nightBottom, dayBottom, daylight);
    if (sunset > 0) {
      top = mixColor(top.replace(/rgb\((\d+),(\d+),(\d+)\)/, (_, r, g, b) => `#${[r,g,b].map(v => Number(v).toString(16).padStart(2,'0')).join('')}`), '#59376b', sunset * .7);
      bottom = mixColor(bottom.replace(/rgb\((\d+),(\d+),(\d+)\)/, (_, r, g, b) => `#${[r,g,b].map(v => Number(v).toString(16).padStart(2,'0')).join('')}`), '#ff9568', sunset * .8);
    }
    const sky = context.createLinearGradient(0, 0, 0, this.groundY);
    sky.addColorStop(0, top);
    sky.addColorStop(1, bottom);
    context.fillStyle = sky;
    context.fillRect(0, 0, this.width, this.height);

    this.drawCelestial(context, cycle, daylight);
    this.drawStars(context, daylight);
    this.clouds.filter(cloud => cloud.layer === 0).forEach(cloud => this.drawCloud(context, cloud, daylight));
    this.drawHills(context, daylight);
    this.clouds.filter(cloud => cloud.layer === 1).forEach(cloud => this.drawCloud(context, cloud, daylight));
    this.drawGround(context, daylight);
    if (this.weather === 'rain') this.drawRain(context);
    if (sunset > .1) {
      const haze = context.createLinearGradient(0, this.groundY * .45, 0, this.groundY);
      haze.addColorStop(0, 'rgba(255,142,105,0)');
      haze.addColorStop(1, `rgba(255,142,105,${sunset * .18})`);
      context.fillStyle = haze;
      context.fillRect(0, 0, this.width, this.groundY);
    }
  }

  drawCelestial(context, cycle, daylight) {
    const angle = cycle * Math.PI * 2 + Math.PI;
    const x = this.width * (.5 + Math.cos(angle) * .43);
    const y = this.groundY * (.72 + Math.sin(angle) * .55);
    const radius = 24;
    const glow = context.createRadialGradient(x, y, 3, x, y, 70);
    glow.addColorStop(0, daylight > .45 ? 'rgba(255,251,196,.92)' : 'rgba(218,237,255,.9)');
    glow.addColorStop(.3, daylight > .45 ? 'rgba(255,222,113,.2)' : 'rgba(166,204,255,.16)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(x, y, 70, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = daylight > .45 ? '#fff6b5' : '#e8f4ff';
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  drawStars(context, daylight) {
    context.save();
    context.globalAlpha = Math.max(0, .88 - daylight * 1.6);
    context.fillStyle = '#fff';
    this.stars.forEach(star => {
      context.globalAlpha = Math.max(0, .88 - daylight * 1.6) * (.55 + Math.sin(this.time * 2 + star.phase) * .35);
      context.beginPath();
      context.arc(star.x * this.width, star.y * this.groundY, star.size, 0, Math.PI * 2);
      context.fill();
    });
    context.restore();
  }

  drawCloud(context, cloud, daylight) {
    context.save();
    context.globalAlpha = cloud.alpha * (.65 + daylight * .6);
    context.fillStyle = daylight > .32 ? '#f4fdff' : '#708ba8';
    const x = cloud.x;
    const y = cloud.y;
    const size = cloud.size;
    context.beginPath();
    context.arc(x, y, size * .42, Math.PI, 0);
    context.arc(x + size * .42, y - size * .18, size * .5, Math.PI, 0);
    context.arc(x + size * .9, y, size * .36, Math.PI, 0);
    context.lineTo(x + size * .9, y + size * .25);
    context.lineTo(x, y + size * .25);
    context.closePath();
    context.fill();
    context.restore();
  }

  drawHills(context, daylight) {
    const horizon = this.groundY;
    const offsetFar = (this.distance * 9) % 150;
    const offsetNear = (this.distance * 18) % 190;
    context.fillStyle = daylight > .35 ? 'rgba(32,117,115,.38)' : 'rgba(10,39,64,.55)';
    context.beginPath();
    context.moveTo(0, horizon);
    for (let x = -200 - offsetFar; x < this.width + 200; x += 150) context.quadraticCurveTo(x + 75, horizon - 115, x + 150, horizon);
    context.closePath();
    context.fill();
    context.fillStyle = daylight > .35 ? 'rgba(20,105,88,.55)' : 'rgba(7,30,46,.75)';
    context.beginPath();
    context.moveTo(0, horizon);
    for (let x = -220 - offsetNear; x < this.width + 220; x += 190) context.quadraticCurveTo(x + 95, horizon - 76, x + 190, horizon);
    context.closePath();
    context.fill();
  }

  drawGround(context, daylight) {
    const groundHeight = this.height - this.groundY;
    const gradient = context.createLinearGradient(0, this.groundY, 0, this.height);
    gradient.addColorStop(0, daylight > .35 ? '#61d18b' : '#23655e');
    gradient.addColorStop(.12, daylight > .35 ? '#2ca36f' : '#17464d');
    gradient.addColorStop(.14, daylight > .35 ? '#d4b66c' : '#665645');
    gradient.addColorStop(1, daylight > .35 ? '#8a6844' : '#332d31');
    context.fillStyle = gradient;
    context.fillRect(0, this.groundY, this.width, groundHeight);
    const stripeOffset = (this.distance * 80) % 38;
    context.fillStyle = 'rgba(255,255,255,.09)';
    for (let x = -40 - stripeOffset; x < this.width + 40; x += 38) {
      context.beginPath();
      context.moveTo(x, this.groundY + 13);
      context.lineTo(x + 15, this.groundY + 13);
      context.lineTo(x + 2, this.height);
      context.lineTo(x - 13, this.height);
      context.closePath();
      context.fill();
    }
    context.fillStyle = 'rgba(255,255,255,.24)';
    context.fillRect(0, this.groundY, this.width, 3);
  }

  drawRain(context) {
    context.save();
    context.strokeStyle = 'rgba(188,225,255,.34)';
    context.lineWidth = 1;
    context.beginPath();
    this.rain.forEach(drop => {
      const x = drop.x * this.width;
      const y = drop.y * this.height;
      context.moveTo(x, y);
      context.lineTo(x - 4, y + drop.length);
    });
    context.stroke();
    context.fillStyle = 'rgba(16,44,67,.1)';
    context.fillRect(0, 0, this.width, this.height);
    context.restore();
  }
}
