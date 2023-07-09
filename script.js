// Constants
const videoElement = document.getElementById("video");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
const startButton = document.getElementById("startButton");
const repetitionCountElement = document.getElementById("repetitionCount");

// Variables
let exerciseStarted = false;
var flipHorizontal = false;
let repetitionCount = 0;
let kneeCount = 0;
let shoulderCount = 0;
let net;
let animationFrameId;
const frameRate = 20;
let angle = [180];
let exercise = "knee";

const model = poseDetection.SupportedModels.BlazePose;
const detectorConfig = {
  runtime: "mediapipe",
  solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/pose",
  // or 'base/node_modules/@mediapipe/pose' in npm.
};

// Load PoseNet model
async function loadPoseNetModel() {
  net = await poseDetection.createDetector(model, detectorConfig);
}

// Event Listener for Start Button
startButton.addEventListener("click", () => {
  if (!exerciseStarted) {
    exerciseStarted = true;
    startButton.innerText = "Stop";
    startProcessing();
  } else {
    exerciseStarted = false;
    startButton.innerText = "Start";
    stopProcessing();
  }
});

// Start video playback and processing
function startProcessing() {
  videoElement.play();
  processVideo();
}

// Stop video playback and processing
function stopProcessing() {
  videoElement.pause();
  cancelAnimationFrame(animationFrameId);
}

function countShoulder(keypoints) {
  if (
    (calculateAngle(keypoints[12], keypoints[14], keypoints[16]) > 170) |
    (calculateAngle(keypoints[12], keypoints[14], keypoints[16]) < 90)
  ) {
    if (
      angle[0] > 170 &&
      calculateAngle(keypoints[12], keypoints[14], keypoints[16]) < 90
    ) {
      console.log("count", shoulderCount);
      console.log("angle", angle);
      shoulderCount += 1;
      repetitionCountElement.innerHTML = `${shoulderCount}`;
    }
    angle.unshift(calculateAngle(keypoints[12], keypoints[14], keypoints[16]));
  }
}

function countKnee(keypoints) {
  if (
    (calculateAngle(keypoints[24], keypoints[26], keypoints[28]) > 150) |
    (calculateAngle(keypoints[24], keypoints[26], keypoints[28]) < 90)
  ) {
    if (
      angle[0] > 150 &&
      calculateAngle(keypoints[24], keypoints[26], keypoints[28]) < 90 &&
      keypoints[11].x > 650
    ) {
      console.log("count", kneeCount);

      kneeCount += 1;
      repetitionCountElement.innerHTML = `${kneeCount}`;
    }
    angle.unshift(calculateAngle(keypoints[24], keypoints[26], keypoints[28]));
  }
}

// Helper function to draw keypoints and lines on canvas
function drawKeypointsAndLines(keypoints, minConfidence, scale = 1) {
  const adjacentKeyPointIndexes = poseDetection.util.getAdjacentPairs(model);

  scale *= videoElement.clientWidth / 800;

  if (exercise == "knee") countKnee(keypoints);
  if (exercise == "shoulder") countShoulder(keypoints);
  // // Draw lines
  adjacentKeyPointIndexes.forEach((indexes) => {
    const [pointA, pointB] = indexes;

    // Check if both points exist and have scores above the minimum confidence
    if (
      keypoints[pointA] &&
      keypoints[pointB] &&
      keypoints[pointA].score >= minConfidence &&
      keypoints[pointB].score >= minConfidence
    ) {
      const x1 = keypoints[pointA].x * scale;
      const y1 =
        (keypoints[pointA].y - 960) * scale + videoElement.clientHeight / 2;
      const x2 = keypoints[pointB].x * scale;
      const y2 =
        (keypoints[pointB].y - 960) * scale + videoElement.clientHeight / 2;

      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.strokeStyle = "red";
      context.lineWidth = 2;
      context.stroke();
    }
  });

  // Draw keypoints
  keypoints.forEach((keypoint) => {
    if (keypoint && keypoint.score >= minConfidence) {
      const { x, y } = keypoint;
      const scaledX = x * scale;
      const scaledY = (y - 960) * scale + videoElement.clientHeight / 2;

      context.beginPath();
      context.arc(scaledX, scaledY, 3, 0, 2 * Math.PI);
      context.fillStyle = "red";
      context.fill();
    }
  });
}

function calculateAngle(keypoint1, keypoint2, keypoint3) {
  const radians =
    Math.atan2(keypoint1.y - keypoint2.y, keypoint1.x - keypoint2.x) -
    Math.atan2(keypoint3.y - keypoint2.y, keypoint3.x - keypoint2.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360 - angle;

  return angle;
}

// Process video frames
async function processVideo() {
  // Check if exercise is stopped
  if (!exerciseStarted) {
    return;
  }

  // Request next animation frame
  animationFrameId = requestAnimationFrame(processVideo);

  // Check if video metadata is available
  if (videoElement.readyState < videoElement.HAVE_METADATA) {
    return;
  }

  console.log(videoElement.clientHeight, videoElement.clientWidth);

  // Perform pose estimation on current frame
  net
    .estimatePoses(videoElement, {
      flipHorizontal: false,
    })
    .then((poses) => {
      // Log pose data

      // Clear canvas
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Draw keypoints and lines on canvas
      drawKeypointsAndLines(
        poses[0].keypoints,
        0.5,
        canvas.width / videoElement.videoWidth
      );
    })
    .catch((error) => {
      console.error("Pose estimation error:", error);
    });
}

// ...

// Draw video frame on canvas
function drawVideoFrame() {
  context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
}

// Start video playback and processing
function startProcessing() {
  videoElement.play();
  drawVideoFrame(); // Draw initial video frame
  processVideo();
}

// ...

// Load PoseNet model on page load
loadPoseNetModel().catch((error) => {
  console.error("Failed to load PoseNet model:", error);
});
