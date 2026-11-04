import React, { useState } from 'react';
import { BookOpen, Atom, Sparkles, MoveRight, HelpCircle } from 'lucide-react';

interface TheoryTopic {
  id: string;
  title: string;
  category: string;
  formula: string;
  description: string;
  variables: { symbol: string; name: string; unit: string; explanation: string }[];
  keyInsight: string;
  gameConnection: string;
}

export const TheoryLab: React.FC = () => {
  const topics: TheoryTopic[] = [
    {
      id: 'kinematics',
      title: 'Projectile Motion & Ballistics',
      category: 'Classical Kinematics',
      formula: 'x(t) = v_0 \\cos(\\theta) \\cdot t, \\quad y(t) = v_0 \\sin(\\theta) \\cdot t - \\frac{1}{2} g t^2',
      description: 'When an object is launched in a uniform gravitational field without aerodynamic drag, its motion decomposes into two independent orthogonal components: constant horizontal velocity and constant downward acceleration due to gravity.',
      variables: [
        { symbol: 'v_0', name: 'Initial Velocity', unit: 'm/s', explanation: 'Muzzle launch speed imparted to the projectile.' },
        { symbol: 'θ', name: 'Launch Angle', unit: 'degrees / radians', explanation: 'Angle relative to the horizontal floor.' },
        { symbol: 'g', name: 'Gravity Acceleration', unit: 'm/s²', explanation: 'Local gravitational field strength (9.8 m/s² on Earth).' },
        { symbol: 't', name: 'Time of Flight', unit: 'seconds', explanation: 'Elapsed duration since release.' }
      ],
      keyInsight: 'Maximum horizontal range on flat ground occurs at exactly 45° in a vacuum, but decreases when air resistance is introduced.',
      gameConnection: 'Used in Level 1 (The Ballistic Flask) where you tune angle and power to arc over the lead barrier.'
    },
    {
      id: 'energy',
      title: 'Conservation of Mechanical Energy',
      category: 'Thermodynamics & Dynamics',
      formula: 'E_{total} = E_k + E_p = \\frac{1}{2} m v^2 + m g h = \\text{Constant}',
      description: 'In an isolated conservative system, total mechanical energy is invariant. Potential energy stored at elevation transforms smoothly into kinetic energy as an object accelerates downward.',
      variables: [
        { symbol: 'E_k', name: 'Kinetic Energy', unit: 'Joules (J)', explanation: 'Energy due to the motion of mass.' },
        { symbol: 'E_p', name: 'Potential Energy', unit: 'Joules (J)', explanation: 'Gravitational energy stored at altitude h.' },
        { symbol: 'm', name: 'Mass', unit: 'kg', explanation: 'Inertial mass of the moving body.' },
        { symbol: 'h', name: 'Height', unit: 'meters', explanation: 'Vertical distance above reference datum.' }
      ],
      keyInsight: 'To safely clear a loop-the-loop of radius R without falling off the top, the drop height must be at least h = 2.5 R.',
      gameConnection: 'Tracked live on the top-left Energy HUD and tested in Level 4 (The Roller Coaster Loop).'
    },
    {
      id: 'momentum',
      title: 'Conservation of Linear Momentum',
      category: 'Newtonian Mechanics',
      formula: 'p = m \\cdot v, \\quad \\sum p_{initial} = \\sum p_{final}',
      description: 'Newton\'s Third Law states that every action produces an equal and opposite reaction. During collisions between bodies in the lab, total momentum is conserved regardless of whether the collision is elastic or inelastic.',
      variables: [
        { symbol: 'p', name: 'Momentum', unit: 'kg·m/s', explanation: 'Vector quantity of mass in motion.' },
        { symbol: 'm_1, m_2', name: 'Masses', unit: 'kg', explanation: 'Inertial masses of the colliding bodies.' },
        { symbol: 'v', name: 'Velocity', unit: 'm/s', explanation: 'Speed and direction prior to impact.' },
        { symbol: 'e', name: 'Restitution', unit: 'dimensionless', explanation: 'Elasticity coefficient (1.0 = perfect elastic).' }
      ],
      keyInsight: 'When a moving mass strikes an equal stationary mass elastically, it transfers 100% of its momentum and comes to a complete halt.',
      gameConnection: 'Powers Level 2 (Newton\'s Impulse Relay) and the 5-ball Newton\'s Cradle sandbox preset.'
    },
    {
      id: 'buoyancy',
      title: 'Archimedes\' Principle & Buoyancy',
      category: 'Fluid Mechanics',
      formula: 'F_b = \\rho_{fluid} \\cdot V_{submerged} \\cdot g',
      description: 'Any body completely or partially submerged in a fluid at rest experiences an upward buoyant force equal to the weight of the fluid displaced by the body.',
      variables: [
        { symbol: 'F_b', name: 'Buoyant Force', unit: 'Newtons (N)', explanation: 'Net upward hydrostatic pressure force.' },
        { symbol: 'ρ_fluid', name: 'Fluid Density', unit: 'kg/m³', explanation: 'Density of water (1.00 g/cm³ or 1000 kg/m³).' },
        { symbol: 'V_sub', name: 'Submerged Volume', unit: 'm³', explanation: 'Portion of object volume beneath the fluid line.' },
        { symbol: 'g', name: 'Gravity', unit: 'm/s²', explanation: 'Downward acceleration pulling on both fluid and body.' }
      ],
      keyInsight: 'If body density < fluid density, the object accelerates upward until buoyant force equals weight (floating equilibrium).',
      gameConnection: 'Explored in Level 3 (Archimedes\' Bathysphere) where you dial the ballast density to achieve neutral docking.'
    },
    {
      id: 'electrostatics',
      title: 'Coulomb\'s Law & Electric Fields',
      category: 'Electromagnetism',
      formula: 'F = k_e \\cdot \\frac{q_1 \\cdot q_2}{r^2}',
      description: 'The electrostatic force between two stationary electric charges is directly proportional to the product of the charges and inversely proportional to the square of the distance between them.',
      variables: [
        { symbol: 'k_e', name: 'Coulomb Constant', unit: 'N·m²/C²', explanation: '8.987 × 10⁹ N·m²/C² in vacuum.' },
        { symbol: 'q_1, q_2', name: 'Charges', unit: 'Coulombs (C)', explanation: 'Scalar electric charges (positive or negative).' },
        { symbol: 'r', name: 'Distance', unit: 'meters', explanation: 'Separation distance between charge centers.' }
      ],
      keyInsight: 'Because force falls off with 1/r², approaching too close to a like charge produces an explosive repulsive deflection.',
      gameConnection: 'Governs Level 5 (Coulomb\'s Electrostatic Maze) where you navigate charged particles.'
    },
    {
      id: 'chaos',
      title: 'Deterministic Chaos & Double Pendulum',
      category: 'Nonlinear Dynamics',
      formula: '\\lambda > 0 \\implies |\\Delta x(t)| \\approx |\\Delta x_0| e^{\\lambda t}',
      description: 'Chaotic systems are completely deterministic (governed by exact Euler-Lagrange equations) yet practically unpredictable due to sensitive dependence on initial conditions (The Butterfly Effect).',
      variables: [
        { symbol: 'λ', name: 'Lyapunov Exponent', unit: 's⁻¹', explanation: 'Measures the exponential rate of trajectory divergence.' },
        { symbol: 'θ_1, θ_2', name: 'Arm Angles', unit: 'radians', explanation: 'Angles of the upper and lower pendulum rods.' },
        { symbol: 'L_1, L_2', name: 'Rod Lengths', unit: 'meters', explanation: 'Rigid link distances connecting masses.' }
      ],
      keyInsight: 'A tiny difference of 0.0001° in the initial angle produces entirely divergent trajectories within just a few swings.',
      gameConnection: 'Featured in Level 6 (Double Pendulum Chaos) with real-time glowing trajectory trace tails.'
    }
  ];

  const [selectedTopicId, setSelectedTopicId] = useState<string>('kinematics');
  const activeTopic = topics.find(t => t.id === selectedTopicId) || topics[0];

  return (
    <div className="flex-1 h-full bg-slate-950 p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Theoretical Physics & Mathematical Models</h1>
            <p className="text-xs text-slate-400 font-mono">Governing differential equations and simulation principles implemented in this lab</p>
          </div>
        </div>

        {/* Topic navigation tabs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {topics.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTopicId(t.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedTopicId === t.id
                  ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-md shadow-sky-500/10'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <div className="text-[10px] font-mono uppercase text-slate-500 font-bold truncate">{t.category}</div>
              <div className="text-xs font-bold truncate mt-0.5">{t.title}</div>
            </button>
          ))}
        </div>

        {/* Selected Topic Detailed Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                {activeTopic.category}
              </span>
              <h2 className="text-2xl font-black text-white mt-1.5">{activeTopic.title}</h2>
            </div>
            {/* Equation callout */}
            <div className="bg-slate-950 px-4 py-3 rounded-xl border border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Governing Equation</span>
              <code className="text-sm font-mono font-bold text-sky-400">{activeTopic.formula}</code>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            {activeTopic.description}
          </p>

          {/* Variables breakdown table */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Atom className="w-4 h-4 text-sky-400" />
              <span>Variable Definitions & Units</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeTopic.variables.map((v, i) => (
                <div key={i} className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center font-mono font-bold text-sky-300 text-sm shrink-0">
                    {v.symbol}
                  </div>
                  <div className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{v.name}</span>
                      <span className="font-mono text-[10px] text-slate-500">[{v.unit}]</span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-normal">{v.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Insight & Lab Connection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Sparkles className="w-4 h-4" />
                <span>Fundamental Insight</span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                {activeTopic.keyInsight}
              </p>
            </div>

            <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                <MoveRight className="w-4 h-4" />
                <span>Applied in Laboratory Level</span>
              </div>
              <p className="text-xs text-indigo-200/90 leading-relaxed">
                {activeTopic.gameConnection}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
