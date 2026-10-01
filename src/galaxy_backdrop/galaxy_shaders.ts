import galaxyOrbVert from "./shaders/galaxy_orb.vert";
import galaxyOrbFrag from "./shaders/galaxy_orb.frag";
import galaxyPinprickVert from "./shaders/galaxy_pinprick.vert";
import galaxyPinprickFrag from "./shaders/galaxy_pinprick.frag";

export const GALAXY_ORB_VERTEX_SHADER = galaxyOrbVert;
export const GALAXY_ORB_FRAGMENT_SHADER = galaxyOrbFrag;

export const GALAXY_PINPRICK_VERTEX_SHADER = galaxyPinprickVert;
export const GALAXY_PINPRICK_FRAGMENT_SHADER = galaxyPinprickFrag;

// Default active shaders (pin-prick experiment active by default)
export const GALAXY_VERTEX_SHADER = GALAXY_PINPRICK_VERTEX_SHADER;
export const GALAXY_FRAGMENT_SHADER = GALAXY_PINPRICK_FRAGMENT_SHADER;
