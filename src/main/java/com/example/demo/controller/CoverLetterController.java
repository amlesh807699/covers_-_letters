package com.example.demo.controller;

import com.example.demo.dto.GenerateRequest;
import com.example.demo.dto.GenerateResponse;
import com.example.demo.service.CoverLetterService;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class CoverLetterController {

    private final CoverLetterService service;

    public CoverLetterController(CoverLetterService service) {
        this.service = service;
    }

    @GetMapping("/health" )
    public Map<String, Object> health() {
        return Map.of(
                "ok", true,
                "aiConfigured",
                service.isAiConfigured()
        );
    }

    @PostMapping("/generate")
    public GenerateResponse generate(
            @Valid @RequestBody GenerateRequest request
    ) {
        try {
            String letter = service.generate(request);

            return new GenerateResponse(
                    true,
                    letter,
                    service.isAiConfigured() ? "gemini" : "template"
            );
        } catch (Exception exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Cover letter generation failed. Check server logs."
            );
        }
    }
}

