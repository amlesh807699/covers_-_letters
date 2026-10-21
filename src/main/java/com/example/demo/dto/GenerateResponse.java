package com.example.demo.dto;


public record GenerateResponse(
        boolean success,
        String letter,
        String provider
) {}
