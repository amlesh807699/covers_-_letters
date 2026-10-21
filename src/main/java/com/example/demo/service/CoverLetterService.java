package com.example.demo.service;



import com.example.demo.dto.GenerateRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
public class CoverLetterService {

    @Value("${gemini.api-key:}")
    private String apiKey;

    @Value("${gemini.model:gemini-2.5-flash}")
    private String model;

    private final RestClient geminiClient =
            RestClient.create("https://generativelanguage.googleapis.com");

    public String generate(GenerateRequest request) {
        if (apiKey == null || apiKey.isBlank()) {
            return generateTemplate(request);
        }

        String prompt = """
            Write a professional job application cover letter.

            Candidate name: %s
            Candidate email: %s
            Target role: %s
            Target company: %s
            Skills: %s
            Experience and projects: %s
            Job description: %s
            Resume text: %s
            Writing tone: %s

            Requirements:
            - Return only the cover letter.
            - Use clear paragraphs.
            - Do not invent qualifications or experience.
            - Use the provided information accurately.
            - Keep it concise and professional.
            """.formatted(
                safe(request.name()),
                safe(request.email()),
                safe(request.role()),
                safe(request.company()),
                safe(request.skills()),
                safe(request.experience()),
                safe(request.jobDescription()),
                safe(request.resumeText()),
                safe(request.tone())
        );

        Map<String, Object> body = Map.of(
                "contents", List.of(
                        Map.of(
                                "parts", List.of(
                                        Map.of("text", prompt)
                                )
                        )
                )
        );

        Map<?, ?> response = geminiClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path("/v1beta/models/{model}:generateContent")
                        .queryParam("key", apiKey)
                        .build(model))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(Map.class);

        if (response == null) {
            throw new IllegalStateException(
                    "Gemini returned an empty response."
            );
        }

        Object candidatesObject = response.get("candidates");

        if (!(candidatesObject instanceof List<?> candidates)
                || candidates.isEmpty()) {
            throw new IllegalStateException(
                    "Gemini did not return a generated letter."
            );
        }

        Object contentObject =
                ((Map<?, ?>) candidates.get(0)).get("content");

        Object partsObject =
                ((Map<?, ?>) contentObject).get("parts");

        if (!(partsObject instanceof List<?> parts)
                || parts.isEmpty()) {
            throw new IllegalStateException(
                    "The generated letter was empty."
            );
        }

        Object textObject =
                ((Map<?, ?>) parts.get(0)).get("text");

        if (!(textObject instanceof String letter)
                || letter.isBlank()) {
            throw new IllegalStateException(
                    "The generated letter was empty."
            );
        }

        return letter.trim();
    }

    private String generateTemplate(GenerateRequest r) {
        return """
            Dear Hiring Manager at %s,

            My name is %s, and I am applying for the %s position.
            My key skills include %s.

            %s

            I would welcome the opportunity to discuss how my skills
            and projects align with your team's needs.

            Thank you for your time and consideration.

            Sincerely,
            %s
            """.formatted(
                r.company(),
                r.name(),
                r.role(),
                r.skills(),
                safe(r.experience()),
                r.name()
        ).trim();
    }

    private String safe(String value) {
        return value == null || value.isBlank()
                ? "Not provided"
                : value;
    }

    public boolean isAiConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }
}


