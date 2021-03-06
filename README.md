GRNsight
========

http://dondi.github.io/GRNsight/

GRNsight is an open source web application and service for visualizing models of small- to medium-scale gene regulatory networks. GRNsight is a joint project of the [Loyola Marymount University](http://www.lmu.edu) Bioinformatics and Biomathematics Groups, headed by [Dr. Kam Dahlquist](http://myweb.lmu.edu/kdahlqui/index.htm), [Dr. John David N. Dionisio](http://myweb.lmu.edu/dondi/), and [Dr. Ben G. Fitzpatrick](http://myweb.lmu.edu/bfitzpatrick/). Undergraduate students initiated the development of GRNsight in Spring 2014, including Britain Southwick (Computer Science, ’14) and Nicole Anguiano (Computer Science, ’16), with consultation from Katrina Sherbina (Biomathematics, ’14). At present, Anindita Varshneya (Biology, ’17), and Mihir Samdarshi (Biology, ’19) are continuing development on the project.

A gene regulatory network (GRN) consists of genes, transcription factors, and the regulatory connections between them, which govern the level of expression of mRNA and protein from those genes. GRNs can be mathematically modeled and simulated by applications such as [GRNmap](http://kdahlquist.github.io/GRNmap/), a MATLAB program that estimates the parameters and performs forward simulations of a differential equations model of a GRN. Computer representations of GRNs, such as the models output by GRNmap, are in the form of a tabular spreadsheet (adjacency matrix) that is not easily interpretable. Ideally, GRNs should be displayed as diagrams (graphs) detailing the regulatory relationships (edges) between each gene (node) in the network. To address this need, we developed GRNsight.

GRNsight allows users to upload spreadsheets generated by GRNmap and uses the information in these spreadsheets to automatically create and display a graph of the GRN model. The application colors the edges and adjusts their thickness based on the sign (activation or repression) and the strength (magnitude) of the regulatory relationship, respectively. Finally, GRNsight then allows the user to modify the graph in order to define the best visual layout for the network. Most of GRNsight is written in JavaScript. HTTP requests are handled using Node.js and the Express framework. Graphs are generated through D3.js, a JavaScript data visualization library.

Although originally designed for gene regulatory networks, we believe that GRNsight has general applicability for displaying any small, unweighted or weighted network with directed edges for systems biology or other application domains. 

Most users will want to access GRNsight through the web application at http://dondi.github.io/GRNsight/.  The source code is available for developers who wish to run their own instance of the GRNsight web service and/or web client.

Documentation on how to use GRNsight is found at https://github.com/dondi/GRNsight, with additional information on the wiki here: https://github.com/dondi/GRNsight/wiki.

If you use GRNsight in your work, please cite:

Dahlquist, K.D., Dionisio, J.D.N., Fitzpatrick, B.G., Anguiano, N.A., Varshneya, A., Southwick, B.J., Samdarshi, M. (2016) GRNsight: a web application and service for visualizing models of small- to medium-scale gene regulatory networks. _PeerJ Computer Science_ 2:e85. [https://doi.org/10.7717/peerj-cs.85](DOI: 10.7717/peerj-cs.85).
