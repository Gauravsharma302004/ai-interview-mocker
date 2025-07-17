"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Webcam from "react-webcam";
import useSpeechToText from "react-hook-speech-to-text";
import { Mic, StopCircle, Loader } from "lucide-react";
import { toast } from "sonner";
import { chatSession } from "@/utils/GeminiAIModal";
import { db } from "@/utils/db";
import { UserAnswer } from "@/utils/schema";
import { useUser } from "@clerk/nextjs";
import moment from "moment";

const RecordAnswerSection = ({
  mockInterviewQuestion,
  activeQuestionIndex,
  interviewData,
}) => {
  const [userAnswer, setUserAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [webcamEnabled, setWebcamEnabled] = useState(true);
  const { user } = useUser();

  const {
    error,
    interimResult,
    isRecording,
    results,
    startSpeechToText,
    stopSpeechToText,
    setResults,
  } = useSpeechToText({
    continuous: true,
    useLegacyResults: false,
  });

  useEffect(() => {
    if (results.length > 0) {
      const combinedAnswer = results.map((result) => result.transcript).join(" ");
      setUserAnswer(combinedAnswer);
    }
  }, [results]);

  useEffect(() => {
    if (!isRecording && userAnswer.length > 10) {
      UpdateUserAnswer();
    }
  }, [userAnswer]);

  const StartStopRecording = () => {
    if (isRecording) {
      stopSpeechToText();
    } else {
      startSpeechToText();
    }
  };

  const UpdateUserAnswer = async () => {
    try {
      setLoading(true);

      const feedbackPrompt = `
        Question: ${mockInterviewQuestion[activeQuestionIndex]?.question},
        User Answer: ${userAnswer},
        Based on the question and user's answer, provide a JSON with two fields: 
        "rating" (integer) and "feedback" (string).
      `;

      const result = await chatSession.sendMessage(feedbackPrompt);
      const responseText = await result.response.text();

      const jsonMatch = responseText.match(/\{.*?\}/s);
      if (!jsonMatch) {
        throw new Error("Invalid JSON received from AI.");
      }

      const feedbackData = JSON.parse(jsonMatch[0]);

      const resp = await db.insert(UserAnswer).values({
        mockIdRef: interviewData?.mockId,
        question: mockInterviewQuestion[activeQuestionIndex]?.question,
        correctAns: mockInterviewQuestion[activeQuestionIndex]?.answer,
        userAns: userAnswer,
        feedback: feedbackData.feedback,
        rating: feedbackData.rating,
        userEmail: user?.primaryEmailAddress?.emailAddress,
        createdAt: moment().format("DD-MM-YYYY"),
      });

      if (resp) {
        toast("User Answer recorded successfully!");
        setUserAnswer("");
        setResults([]);
      }
    } catch (error) {
      console.error("Error updating user answer:", error);
      toast.error("Failed to save your answer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <p className="text-red-500">
        Web Speech API is not available in this browser. Please try another browser.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative my-10">
        {webcamEnabled ? (
          <Webcam
            style={{ height: 300, width: "100%", borderRadius: "10px" }}
            mirrored
            onUserMediaError={() => setWebcamEnabled(false)}
          />
        ) : (
          <div className="bg-gray-800 h-72 w-full flex items-center justify-center rounded-lg">
            <p className="text-gray-500">Webcam is not enabled or supported.</p>
          </div>
        )}
      </div>

      <Button
        disabled={loading}
        variant="outline"
        className="my-5"
        onClick={StartStopRecording}
      >
        {isRecording ? (
          <span className="text-red-600 flex items-center gap-2">
            <StopCircle className="animate-pulse" /> Stop Recording
          </span>
        ) : (
          <span className="text-primary flex items-center gap-2">
            <Mic /> Start Recording
          </span>
        )}
      </Button>

      {loading && (
        <div className="flex items-center gap-2 text-primary">
          <Loader className="animate-spin" /> Saving your answer...
        </div>
      )}
    </div>
  );
};

export default RecordAnswerSection;
