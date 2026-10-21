package com.example.demo.controller;



import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/resume")
public class ResumeController {

    @PostMapping(
            value = "/extract",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public Map<String, String> extract(
            @RequestParam("file") MultipartFile file
    ) throws IOException {

        if (file.isEmpty() || file.getSize() > 5 * 1024 * 1024) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Upload a non-empty PDF smaller than 5 MB."
            );
        }

        String contentType = file.getContentType();

        if (contentType != null
                && !contentType.equals("application/pdf")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Only PDF files are supported."
            );
        }

        byte[] bytes = file.getBytes();

        if (bytes.length < 5
                || bytes[0] != '%'
                || bytes[1] != 'P'
                || bytes[2] != 'D'
                || bytes[3] != 'F'
                || bytes[4] != '-') {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "The uploaded file is not a valid PDF."
            );
        }

        try (PDDocument document = Loader.loadPDF(bytes)) {
            String text = new PDFTextStripper()
                    .getText(document)
                    .trim();

            if (text.isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "No selectable text found. This PDF may be scanned."
                );
            }

            return Map.of("resumeText", text);
        }
    }
}

