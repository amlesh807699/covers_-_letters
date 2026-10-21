package com.example.demo.dto;


import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GenerateRequest(
        @NotBlank
        @Size(max = 100)
        String name,

        @Size(max = 254)
        String email,

        @NotBlank
        @Size(max = 150)
        String role,

        @NotBlank
        @Size(max = 150)
        String company,

        @NotBlank
        @Size(max = 3000)
        String skills,

        @Size(max = 5000)
        String experience,

        @Size(max = 10000)
        String jobDescription,

        @Size(max = 30)
        String tone,

        @Size(max = 20000)
        String resumeText
) {}
