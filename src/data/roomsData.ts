import { RoomDefinition, RoomId } from '../types/game';

export const ROOMS_DATA: Record<RoomId, RoomDefinition> = {
  1: {
    id: 1,
    code: 'SECTOR 01',
    title: 'The Gravity Chamber',
    subtitle: 'Gravity, Mass & Acceleration',
    topic: 'Gravitational Force & Free-Fall Kinematics',
    primaryFormula: 'F = m · g   |   v = u + a · t',
    briefing:
      'You awaken inside the vertical Gravity Calibration Chamber. Two spheres of different mass rest on test pedestals, and the exit blast door requires both the Floor Weight Plate and the Upper Kinetic Switch to engage.',
    objectives: [
      'Drop spheres from platforms and observe free-fall acceleration',
      'Place the 8 kg Heavy Sphere on the Floor Weight Plate (>= 50 N)',
      'Use the Gravity Control Machine to invert gravity and trigger the Ceiling Kinetic Switch',
      'Walk through the unlocked Exit Door',
    ],
    hints: [
      'Gravity pulls every mass downward with F = m × g. A 2 kg sphere weighs only 19.6 N on Earth, while an 8 kg sphere weighs 78.4 N — enough to compress the 50 N floor plate.',
      'Pick up the dark Heavy Lead Sphere (8 kg) with E or Left Click and drop it onto the glowing Floor Weight Plate near the door. Then look at the Gravity Control Machine to adjust the gravity field.',
      'Step 1: Carry the 8 kg Heavy Sphere onto the Floor Weight Plate (Lock 1). Step 2: Interact with the Gravity Console to switch gravity to Inverted (-9.8 m/s²) so the 2 kg Light Sphere floats up to hit the Ceiling Switch (Lock 2). Step 3: Restore Earth or Moon gravity and exit!',
    ],
    accentColor: '#38bdf8',
    educational: {
      concept: 'Gravity, Mass, Weight & Free-Fall Acceleration',
      formula: 'F = m · g   and   y = v₀t + ½gt²',
      realLifeExample:
        'Astronauts on the Moon (g = 1.62 m/s²) experience only 1/6th of their Earth weight (F = mg) even though their mass (m) remains unchanged. On the Apollo 15 mission, David Scott proved Galileo’s law by dropping a hammer and a feather together—they hit the lunar surface simultaneously!',
      puzzleExplanation:
        'In the Gravity Chamber, both the 2 kg and 8 kg spheres accelerated downward at the exact same rate g, yet only the 8 kg sphere generated enough gravitational weight force (78.4 N >= 50 N) to depress the Floor Plate. Inverting g reversed the net force upward, lifting the light sphere to the ceiling switch.',
      questions: [
        {
          id: 'r1q1',
          question: 'If an 8 kg metal sphere is taken to the Moon (g ≈ 1.6 m/s²), what happens to its mass and weight?',
          options: [
            'Both mass and weight stay the same',
            'Mass stays 8 kg, while weight drops to ~12.8 N',
            'Weight stays 78.4 N, while mass drops to 1.3 kg',
            'Both mass and weight become zero',
          ],
          correctIndex: 1,
          explanation: 'Mass (amount of matter) is invariant at 8 kg, while gravitational weight F = m × g decreases proportionally with g.',
        },
        {
          id: 'r1q2',
          question: 'Ignoring air resistance, if you drop a 2 kg sphere and an 8 kg sphere from the same height at the same time, which lands first?',
          options: [
            'The 8 kg sphere lands 4 times faster',
            'The 2 kg sphere lands first because it has less inertia',
            'They land at the exact same time',
            'Neither falls unless pushed',
          ],
          correctIndex: 2,
          explanation: 'By Newton’s second law, a = F/m = (mg)/m = g. Gravitational acceleration is independent of mass in a vacuum.',
        },
        {
          id: 'r1q3',
          question: 'Under Earth gravity (g = 9.8 m/s²), what is the speed of a dropped sphere after falling for 2 seconds from rest?',
          options: ['4.9 m/s', '9.8 m/s', '19.6 m/s', '39.2 m/s'],
          correctIndex: 2,
          explanation: 'Using v = u + at with u = 0, a = 9.8 m/s², and t = 2 s gives v = 19.6 m/s.',
        },
      ],
    },
  },
  2: {
    id: 2,
    code: 'SECTOR 02',
    title: 'The Force & Motion Lab',
    subtitle: "Newton's Laws, Friction & Acceleration",
    topic: "Newton's Second Law & Kinetic Friction",
    primaryFormula: 'F_net = m · a   |   f_k = μ · m · g',
    briefing:
      'Welcome to the Dynamics Bay. Two cargo crates—a 5 kg Titanium Crate and a 20 kg Heavy Core Crate—must be propelled across test tracks of ice, brushed steel, and high-friction rubber onto their target pressure pads.',
    objectives: [
      'Tune the Force Thruster level (60 N, 180 N, or 360 N) on the Control Console',
      'Propel the 5 kg Crate across the Ice/Ramp track onto Pad A',
      'Overcome friction to push the 20 kg Heavy Crate onto Pad B',
      'Exit through the unlocked blast door',
    ],
    hints: [
      'According to F_net = m·a and friction f_k = μ·m·g, an object only accelerates if your applied push force F exceeds the opposing friction force f_k!',
      'Walk up to a crate and click / press E to apply the currently selected Force impulse. Use the Force Selector Console to raise force above 60 N when pushing the 20 kg Heavy Crate across steel (μ = 0.25 -> f_k ≈ 49 N) or rubber.',
      'Select 180 N or 360 N on the Force Console! Push the 5 kg Crate along the slick Ice Track & Ramp onto Pad A, and push the 20 kg Crate down the central track onto Pad B.',
    ],
    accentColor: '#22d3ee',
    educational: {
      concept: "Newton's Second Law & Kinetic Friction",
      formula: 'a = (F_applied − μ·m·g) / m',
      realLifeExample:
        'Car tires use high-friction rubber compounds (μ ≈ 0.7–0.9) to grip asphalt and accelerate safely, whereas ice (μ ≈ 0.04) offers almost no traction, causing vehicles to slide with very little deceleration.',
      puzzleExplanation:
        'You saw firsthand how identical forces produce smaller acceleration on the 20 kg mass than on the 5 kg mass (a = F/m), and how high-friction surfaces oppose motion until applied force exceeds μmg.',
      questions: [
        {
          id: 'r2q1',
          question: 'If you apply the same 100 N net force to a 5 kg crate and a 20 kg crate, how do their accelerations compare?',
          options: [
            'The 20 kg crate accelerates 4 times faster',
            'The 5 kg crate accelerates 4 times faster',
            'Both accelerate equally',
            'Neither crate moves',
          ],
          correctIndex: 1,
          explanation: 'From a = F/m, acceleration is inversely proportional to mass: 100/5 = 20 m/s² vs 100/20 = 5 m/s².',
        },
        {
          id: 'r2q2',
          question: 'A 20 kg crate rests on a rubber floor with kinetic friction μ = 0.60 (g = 9.8 m/s²). Roughly how much friction force opposes sliding?',
          options: ['12 N', '49 N', '117.6 N', '196 N'],
          correctIndex: 2,
          explanation: 'Friction f = μ × m × g = 0.60 × 20 × 9.8 = 117.6 N.',
        },
        {
          id: 'r2q3',
          question: 'Why does a crate slide much farther on ice than on rubber after being pushed?',
          options: [
            'Ice reduces the crate’s mass',
            'Ice has a much lower coefficient of friction μ, so decelerating force is tiny',
            'Gravity is weaker over ice',
            'Ice creates forward magnetic thrust',
          ],
          correctIndex: 1,
          explanation: 'Lower μ produces a smaller opposing friction force f = μN, meaning less negative acceleration.',
        },
      ],
    },
  },
  3: {
    id: 3,
    code: 'SECTOR 03',
    title: 'The Optics Laser Room',
    subtitle: 'Reflection & Refraction of Light',
    topic: "Law of Reflection & Snell's Law",
    primaryFormula: 'θ_i = θ_r   |   n₁·sin(θ₁) = n₂·sin(θ₂)',
    briefing:
      'A high-energy cyan laser fires across this darkened optical chamber. Rotate the precision mirrors and calibrate the refractive glass prism so the laser beam weaves past the central pillar and strikes the Photonic Door Receiver.',
    objectives: [
      'Rotate Mirror 1, Mirror 2, and Mirror 3 to steer the cyan laser beam',
      'Pass the beam through the Refractive Glass Prism (test material index n)',
      'Align the final beam directly onto the Photonic Receiver on the exit wall',
    ],
    hints: [
      'Light obeys the Law of Reflection: the angle of incidence equals the angle of reflection (θ_i = θ_r). When light enters a denser glass medium (n > 1), Snell’s Law bends the ray toward the normal.',
      'Click or press E on any Mirror Pedestal to rotate it in 15° steps. Also try interacting with the Glass Prism Console to adjust its refractive index (Crown Glass n = 1.52 bends the beam straight into Mirror 3!).',
      'Aim Mirror 1 at 45° so the laser shoots across to Mirror 2; set Mirror 2 to direct the beam through the Crown Glass Prism (n = 1.52); then rotate Mirror 3 to aim straight into the glowing Photonic Receiver!',
    ],
    accentColor: '#a855f7',
    educational: {
      concept: 'Specular Reflection & Snell’s Law of Refraction',
      formula: 'θ_i = θ_r   and   n₁ sin(θ₁) = n₂ sin(θ₂)',
      realLifeExample:
        'Fiber-optic internet cables carry laser pulses across oceans using total internal reflection, while camera lenses and eyeglasses use glass with specific refractive indices (n) to focus light sharply onto a sensor or retina.',
      puzzleExplanation:
        'Rotating each mirror changed its surface normal, steering the reflected beam by twice the mirror’s rotation angle. Passing through the refractive prism bent and offset the light ray according to its refractive index n.',
      questions: [
        {
          id: 'r3q1',
          question: 'According to the Law of Reflection, if a laser strikes a mirror at 35° from the surface normal, what is the angle of reflection?',
          options: ['17.5°', '35°', '55°', '70°'],
          correctIndex: 1,
          explanation: 'The angle of reflection always equals the angle of incidence (θ_r = θ_i = 35°).',
        },
        {
          id: 'r3q2',
          question: 'When a beam of light travels from air (n = 1.0) into dense glass (n = 1.5) at an angle, how does it bend?',
          options: [
            'It bends toward the surface normal because light slows down in glass',
            'It bends away from the normal because light speeds up',
            'It reflects 100% backward',
            'Its path never changes',
          ],
          correctIndex: 0,
          explanation: 'By Snell’s Law n₁ sin(θ₁) = n₂ sin(θ₂), a higher refractive index n₂ results in a smaller angle θ₂ toward the normal.',
        },
        {
          id: 'r3q3',
          question: 'If you rotate a mirror by 15°, by how many degrees does the reflected laser beam turn?',
          options: ['7.5°', '15°', '30°', '45°'],
          correctIndex: 2,
          explanation: 'Turning the mirror rotates the normal by 15°, shifting both the angle of incidence and reflection by 15°, for a total beam deflection of 30°.',
        },
      ],
    },
  },
  4: {
    id: 4,
    code: 'SECTOR 04',
    title: 'The Magnetic Mystery Room',
    subtitle: 'Attraction, Repulsion & Electromagnets',
    topic: 'Magnetic Poles & Electromagnetic Induction',
    primaryFormula: 'F ∝ (m₁ · m₂) / r²   |   N↔S Attract, N↔N Repel',
    briefing:
      'Strong magnetic fields hum across this containment sector. Move the Portable Magnet Cube, toggle the Electromagnet Coils, and guide both the Ferromagnetic Core and Polarized Slider into their lock sockets.',
    objectives: [
      'Flip or position the Portable Magnet to guide the Polarized Slider via attraction/repulsion',
      'Energize the Electromagnet Coil to pull the Iron Core across the barrier channel onto Inductive Pad 1',
      'Lock the Polarized Slider into Magnetic Socket 2 to open the exit door',
    ],
    hints: [
      'Opposite magnetic poles (North–South) attract, while like poles (North–North or South–South) repel! Ferromagnetic iron is always attracted to any energized magnet pole.',
      'Use the Electromagnet Console on the left to power ON Coil A so it pulls the heavy Iron Core along the glass rail onto Inductive Pad 1. Then pick up the Portable Magnet Cube (click E) or flip its polarity (click the Flip Switch) near the Polarized Slider!',
      'Power ON Electromagnet Coil A to pull the Iron Core onto Pad 1. Next, carry the Portable Magnet Cube behind the South-facing Polarized Slider and set the cube’s facing pole to South (or place it in front with North facing) to push/pull it into Socket 2!',
    ],
    accentColor: '#6366f1',
    educational: {
      concept: 'Magnetic Poles, Attraction/Repulsion & Electromagnetism',
      formula: 'B = μ₀ · n · I   (Solenoid Magnetic Field)',
      realLifeExample:
        'Maglev (magnetic levitation) trains float above guideways using powerful opposing superconducting magnets and propel forward at over 500 km/h using alternating electromagnetic attraction and repulsion.',
      puzzleExplanation:
        'Animated field lines showed how magnetic flux loops from North to South poles. Energizing the solenoid coil created a controllable electromagnet that attracted the ferromagnetic core, while matching poles repelled the polarized slider into its lock.',
      questions: [
        {
          id: 'r4q1',
          question: 'What happens when the North pole of one magnet is brought close to the North pole of another magnet?',
          options: [
            'They strongly attract',
            'They repel each other',
            'They cancel gravity',
            'Nothing happens unless heated',
          ],
          correctIndex: 1,
          explanation: 'Like magnetic poles (N–N or S–S) always repel, while opposite poles (N–S) attract.',
        },
        {
          id: 'r4q2',
          question: 'What is the main advantage of an electromagnet compared to a permanent bar magnet?',
          options: [
            'It works without any electricity',
            'Its magnetic field can be turned on, off, and reversed by controlling electric current',
            'It attracts plastic and wood',
            'It never loses heat',
          ],
          correctIndex: 1,
          explanation: 'Because B = μ₀nI depends on electric current I, switching or reversing current instantly toggles or flips the magnetic field.',
        },
        {
          id: 'r4q3',
          question: 'If the distance r between two magnetic poles is halved, how does the magnetic force change?',
          options: [
            'It becomes half as strong',
            'It stays identical',
            'It increases dramatically (roughly 4× stronger near poles)',
            'It reverses polarity',
          ],
          correctIndex: 2,
          explanation: 'Magnetic force drops rapidly with distance (inverse-square / inverse-cube for dipoles), so halving distance sharply increases force.',
        },
      ],
    },
  },
  5: {
    id: 5,
    code: 'SECTOR 05',
    title: 'The Energy Escape Chamber',
    subtitle: 'Potential & Kinetic Energy Conservation',
    topic: 'Conservation of Mechanical Energy',
    primaryFormula: 'PE = m·g·h   |   KE = ½·m·v²   |   E_total = PE + KE',
    briefing:
      'You have reached the Main Turbine Core—the final barrier to freedom! Align the adjustable roller ramps, select an appropriate drop height on the Launch Tower, and deliver >= 340 J of kinetic energy into the Final Energy Generator.',
    objectives: [
      'Adjust Bridge Ramp 1 and Boost Ramp 2 to create a continuous track to the Generator',
      'Select a launch elevation on the Tower Console that stores enough Potential Energy (PE = mgh)',
      'Release the 5 kg Energy Sphere to power the Generator and open the Escape Portal!',
    ],
    hints: [
      'Total mechanical energy is conserved: PE_top = m·g·h converts into KE = ½·m·v² at the bottom. With a 5 kg sphere and g = 9.8 m/s², you need h >= 7 m to exceed 340 J!',
      'Interact with Ramp Lever 1 and Ramp Lever 2 so both bridge segments align cleanly with the track! Then set the Drop Height on the Tower Console to High (8 m) and press Launch Sphere.',
      'Step 1: Set Ramp 1 to "Aligned" and Ramp 2 to "Up-Slope". Step 2: Set Launch Height to 8.0 m (PE = 392 J). Step 3: Click Release Sphere! Once the Generator activates, walk into the glowing Escape Portal!',
    ],
    accentColor: '#10b981',
    educational: {
      concept: 'Conservation of Mechanical Energy (PE ↔ KE)',
      formula: 'm·g·h = ½·m·v²',
      realLifeExample:
        'Hydroelectric dams store colossal gravitational potential energy in elevated water reservoirs; as water plunges through penstocks, PE converts into kinetic energy to spin turbines and generate clean electricity.',
      puzzleExplanation:
        'Raising the 5 kg sphere to 8 m stored 392 J of gravitational potential energy. As it rolled down the aligned track, PE transformed smoothly into kinetic energy (KE = ½mv²), giving it the high speed needed to spin up the final generator!',
      questions: [
        {
          id: 'r5q1',
          question: 'A 5 kg ball is held at 8 m height (g = 9.8 m/s²). How much gravitational potential energy does it store?',
          options: ['49 J', '196 J', '392 J', '784 J'],
          correctIndex: 2,
          explanation: 'PE = m × g × h = 5 × 9.8 × 8 = 392 Joules.',
        },
        {
          id: 'r5q2',
          question: 'At the very bottom of a frictionless roller-coaster track, what happens to the ball’s Potential and Kinetic Energy?',
          options: [
            'PE is maximum and KE is zero',
            'PE is minimum and KE reaches its maximum value',
            'Both PE and KE become zero',
            'Total energy doubles',
          ],
          correctIndex: 1,
          explanation: 'By Conservation of Energy, all lost gravitational potential energy converts into kinetic energy ½mv² at the lowest point.',
        },
        {
          id: 'r5q3',
          question: 'If the speed v of a moving ball doubles, by what factor does its Kinetic Energy (KE = ½mv²) increase?',
          options: ['2 times', '3 times', '4 times', '8 times'],
          correctIndex: 2,
          explanation: 'Because velocity is squared in KE = ½mv², doubling speed multiplies kinetic energy by 2² = 4.',
        },
      ],
    },
  },
};

export const ROOM_ORDER: RoomId[] = [1, 2, 3, 4, 5];
