// The Catjang Electron spring constants, integrated at a fixed 60 Hz.
export class Accordion {
    constructor() { this.t = 0; this.tv = 0; this.angle = 0; this.angularVelocity = 0;
        this.dx = Array(16).fill(0); this.velocity = Array(16).fill(0);
        this.previousDx = 0; this.kick = 0; this.held = 0; this.releasing = false; this.accumulator = 0; }
    move(dx) {
        const bounded = Math.max(-80, Math.min(80, dx));
        this.angularVelocity += (bounded - this.previousDx) * .065;
        this.previousDx = bounded; this.kick = bounded;
    }
    release() { this.releasing = true; this.tv = -this.t * .55; this.kick = 0;
        this.dx.fill(0); this.velocity.fill(0); }
    update(seconds, maxExtension = 1) {
        this.accumulator += Math.min(.1, seconds);
        while (this.accumulator >= 1 / 60) {
            this.accumulator -= 1 / 60;
            if (this.releasing) { this.tv = (this.tv - this.t * .13) * .78; this.t += this.tv; }
            else { this.held += 1000 / 60; this.t = (1 - (1 - Math.min(1, this.held / 260)) ** 2.4) * maxExtension; }
            this.angularVelocity = (this.angularVelocity - this.angle * (this.releasing ? .003 : .018)) * (this.releasing ? .962 : .86);
            this.angle = Math.max(-45, Math.min(45, this.angle + this.angularVelocity));
            const pendulum = Math.sin(this.angle * Math.PI / 180) * 22;
            for (let index = 0; index < 16; index++) {
                const depth = index / 15; const previous = Math.max(0, index - 1) / 15;
                const target = pendulum * (depth * depth - previous * previous);
                this.velocity[index] = (this.velocity[index] + (target - this.dx[index]) * .038) * .93;
                this.dx[index] = Math.max(-2.5, Math.min(2.5, this.dx[index] + this.velocity[index]));
            }
            if (!this.releasing && Math.abs(this.kick) > 6) {
                this.velocity[0] -= Math.sign(this.kick) * Math.abs(this.kick) ** 1.3 * .008;
                this.kick *= .6;
            }
            this.previousDx *= .78;
        }
        return this.t;
    }
    offsets() { let accumulated = 0; return this.dx.map(value => { accumulated += value; return accumulated; }); }
}
